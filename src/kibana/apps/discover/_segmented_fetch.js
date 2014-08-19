define(function (require) {
  return function DiscoverSegmentedFetch(es, Private, Promise, Notifier) {
    var _ = require('lodash');
    var moment = require('moment');
    var searchStrategy = Private(require('components/courier/fetch/strategy/search'));
    var eventName = 'segmented fetch';

    var notify = new Notifier({
      location: 'Segmented Fetch'
    });

    // var segmentedFetch = {};
    function segmentedFetch(searchSource) {
      this.searchSource = searchSource;
      this.running = false;
      this.activeRequest = null;
      this.notifyEvent = null;
    }

    // segmentedFetch.prototype.setSearchSource(searchSource) {
    //   this.searchSource = searchSource;
    // };

    segmentedFetch.prototype._startRequest = function (req) {
      this.activeRequest = req;
      this.running = true;
      this.notifyEvent = notify.event(eventName);
    };

    segmentedFetch.prototype._stopRequest = function () {
      this.activeRequest = null;
      this.running = false;
      if (_.isFunction(this.notifyEvent)) {
        this.notifyEvent();
        this.notifyEvent = null;
      }
    };

    segmentedFetch.prototype._execSearch = function (index, state) {
      this.searchPromise = es.search({
        index: index,
        type: state.type,
        ignoreUnavailable: true,
        body: state.body
      });

      // don't throw ClusterBlockException errors
      this.searchPromise.catch(function (err) {
        if (err.status === 403 && err.message.match(/ClusterBlockException.+index closed/)) {
          return false;
        } else {
          throw err;
        }
      });

      return this.searchPromise;
    };

    segmentedFetch.prototype._getQueue = function () {
      return this.searchSource.get('index').toIndexList();
    };

    segmentedFetch.prototype.abort = function () {
      var self = this;
      this._stopRequest();
      this.searchPromise.abort();
    };

    /**
     * Fetch search results, but segment by index name.
     *
     * @param {object} opts
     * @param {SearchSource} opts.searchSource - The searchSource to base the fetch on
     * @param {number} opts.totalSize - The maximum number of rows that should be returned, as a sum of all segments
     * @param {enum} opts.direction - The direction that indices should be fetched. When fetching time based data
     *                              in decening order, this should be set to descending so that the data comes in its
     *                              proper order, otherwize indices will be fetched ascending
     *
     * // all callbacks can return a promise to delay further processing
     * @param {function} opts.first - a function that will be called for the first segment
     * @param {function} opts.each - a function that will be called for each segment
     * @param {function} opts.eachMerged - a function that will be called with the merged result on each segment
     *
     * @return {Promise}
     */
    segmentedFetch.prototype.fetch = function (opts) {
      var self = this;
      opts = opts || {};
      var direction = opts.direction;
      var limitSize = false;
      var remainingSize = false;

      if (opts.totalSize) {
        limitSize = true;
        remainingSize = opts.totalSize;
      }

      var req = self.searchSource._createRequest();
      req.moment = moment();
      req.source.activeFetchCount += 1;

      // track the req out of scope so that while we are itterating we can
      // ensure we are still relevant
      self._startRequest(req);

      var queue = self._getQueue();
      var total = queue.length;
      var active = null;
      var complete = [];

      if (!_.isArray(queue)) {
        queue = [queue];
      }

      if (direction === 'desc') {
        queue = queue.reverse();
      }

      var i = -1;
      var merged = {
        took: 0,
        hits: {
          hits: [],
          total: 0,
          max_score: 0
        }
      };

      function reportStatus() {
        if (!opts.status) return;
        opts.status({
          total: total,
          complete: complete.length,
          remaining: queue.length,
          active: active
        });
      }

      reportStatus();
      searchStrategy.getSourceStateFromRequest(req)
      .then(function (state) {
        return (function recurse() {
          var index = queue.shift();
          active = index;

          reportStatus();

          if (limitSize) {
            state.body.size = remainingSize;
          }
          req.state = state;

          return self._execSearch(index, state)
          .then(function (resp) {
            // abort if fetch is called twice quickly
            if (!self.running || req !== self.activeRequest) {
              return;
            }

            // a response was swallowed intentionally. Try the next one
            if (!resp) {
              if (queue.length) return recurse();
              else return done();
            }

            // increment i after we are sure that we have a valid response
            // so that we always call opts.first()
            i++;

            var start; // promise that starts the chain
            if (i === 0 && _.isFunction(opts.first)) {
              start = Promise.try(opts.first, [resp, req]);
            } else {
              start = Promise.resolve();
            }

            if (limitSize) {
              remainingSize -= resp.hits.hits.length;
            }

            return start.then(function () {
              var prom = each(merged, resp);
              return prom;
            })
            .then(function () {
              if (_.isFunction(opts.each)) {
                return opts.each(resp, req);
              }
            })
            .then(function () {
              var mergedCopy = _.omit(merged, '_bucketIndex');
              req.resp = mergedCopy;

              if (_.isFunction(opts.eachMerged)) {
                // resolve with a "shallow clone" that omits the _aggIndex
                // which helps with watchers and protects the index
                return opts.eachMerged(mergedCopy, req);
              }
            })
            .then(function () {
              complete.push(index);
              if (queue.length) return recurse();
              return done();
            });
          });
        }());
      })
      .then(req.defer.resolve, req.defer.reject);

      function done() {
        self._stopRequest();
        req.complete = true;
        req.ms = req.moment.diff() * -1;
        req.source.activeFetchCount -= 1;
        return (i + 1);
      }

      return req.defer.promise;
    };

    function each(merged, resp) {
      merged.took += resp.took;
      merged.hits.total = Math.max(merged.hits.total, resp.hits.total);
      merged.hits.max_score = Math.max(merged.hits.max_score, resp.hits.max_score);
      [].push.apply(merged.hits.hits, resp.hits.hits);

      if (!resp.aggregations) return;

      var aggKey = _.find(Object.keys(resp.aggregations), function (key) {
        return key.substr(0, 4) === 'agg_';
      });

      // start merging aggregations
      if (!merged.aggregations) {
        merged.aggregations = {};
        merged.aggregations[aggKey] = {
          buckets: []
        };
        merged._bucketIndex = {};
      }

      resp.aggregations[aggKey].buckets.forEach(function (bucket) {
        var mbucket = merged._bucketIndex[bucket.key];
        if (mbucket) {
          mbucket.doc_count += bucket.doc_count;
          return;
        }

        mbucket = merged._bucketIndex[bucket.key] = bucket;
        merged.aggregations[aggKey].buckets.push(mbucket);
      });
    }

    return segmentedFetch;
  };
});