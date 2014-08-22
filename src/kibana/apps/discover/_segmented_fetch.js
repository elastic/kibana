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
      this.queue = [];
      this.completedQueue = [];
      this.requestHandlers = {};
      this.running = false;
      this.activeRequest = null;
      this.notifyEvent = null;
    }

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
     * @param {function} opts.status - a function that will be called for each segment and given the process status
     *
     * @return {Promise}
     */
    segmentedFetch.prototype.fetch = function (opts) {
      var self = this;
      var req;
      opts = opts || {};

      // keep an internal record of the attached handlers
      self._setRequestHandlers(opts);

      return Promise.try(function () {
        return self._extractQueue(opts.direction);
      })
      .then(function () {
        req = self._createRequest();
        return req;
      })
      .then(function (req) {
        return self._startRequest(req);
      })
      .then(function () {
        return self._executeRequest(req, opts);
      }).then(function () {
        return self._stopRequest();
      });
    };

    segmentedFetch.prototype.abort = function () {
      var self = this;
      var stop = self._stopRequest();

      // if we have a searchPromise, abort it as well
      if (self.searchPromise && 'abort' in self.searchPromise) {
        return stop.then(self.searchPromise.abort);
      }

      return stop;
    };

    segmentedFetch.prototype._startRequest = function (req) {
      var self = this;
      self.requestStats = {
        took: 0,
        hits: {
          hits: [],
          total: 0,
          max_score: 0
        }
      };
      var p = Promise.resolve();

      // stop any existing segmentedFetches
      if (self.running) {
        p = p.then(function () {
          self._stopRequest();
        });
      }

      return p.then(function () {
        self.activeRequest = req;
        self.running = true;
        self.notifyEvent = notify.event(eventName);
      });
    };

    segmentedFetch.prototype._stopRequest = function () {
      var self = this;
      var p = Promise.resolve();

      return p.then(function () {
        self.activeRequest = null;
        self.running = false;
        if (_.isFunction(self.notifyEvent)) {
          self.notifyEvent();
          self.notifyEvent = null;
        }
      });
    };

    segmentedFetch.prototype._setRequestHandlers = function (handlers) {
      this.requestHandlers = {
        first: handlers.first,
        each: handlers.each,
        eachMerged: handlers.eachMerged,
        status: handlers.status,
      };
    };

    segmentedFetch.prototype._statusReport = function (active) {
      var self = this;

      if (!self.requestHandlers.status) return;

      var status = {
        total: self.queue.length,
        complete: self.completedQueue.length,
        remaining: self.queue.length,
        active: active
      };
      self.requestHandlers.status(status);

      return status;
    };

    segmentedFetch.prototype._extractQueue = function (direction) {
      var self = this;
      var queue = self.searchSource.get('index').toIndexList();

      if (!_.isArray(queue)) {
        queue = [queue];
      }

      if (direction === 'desc') {
        queue = queue.reverse();
      }

      self.queue = queue;
    };

    segmentedFetch.prototype._createRequest = function () {
      var self = this;
      var req = self.searchSource._createRequest();
      req.moment = moment();
      req.source.activeFetchCount += 1;
      return req;
    };

    segmentedFetch.prototype._executeSearch = function (index, state) {
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

    segmentedFetch.prototype._executeRequest = function (req, opts) {
      var self = this;
      var complete = [];
      var remainingSize = false;

      if (opts.totalSize) {
        remainingSize = opts.totalSize;
      }

      // initial status report
      self._statusReport(null);

      searchStrategy.getSourceStateFromRequest(req)
      .then(function (state) {
        var loopCount = -1;
        return self._processQueue(req, state, remainingSize, loopCount);
      })
      .then(req.defer.resolve, req.defer.reject);

      return req.defer.promise;
    };

    segmentedFetch.prototype._processQueue = function (req, state, remainingSize, loopCount) {
      var self = this;
      var index = self.queue.shift();

      // update the status on every iteration
      self._statusReport(index);

      if (remainingSize !== false) {
        state.body.size = remainingSize;
      }

      req.state = state;

      return self._executeSearch(index, state)
      .then(function (resp) {
        // abort if not in running state, or fetch is called twice quickly
        if (!self.running || req !== self.activeRequest) return;

        // a response was swallowed intentionally. Try the next one
        if (!resp) {
          if (self.queue.length) return self._processQueue(req, state, remainingSize, loopCount);
          else return self._processQueueComplete(req, loopCount);
        }

        // increment loopCount after we are sure that we have a valid response
        // so that we always call self.requestHandlers.first()
        loopCount++;

        var start; // promise that starts the chain
        if (loopCount === 0 && _.isFunction(self.requestHandlers.first)) {
          start = Promise.try(self.requestHandlers.first, [resp, req]);
        } else {
          start = Promise.resolve();
        }

        if (remainingSize !== false) {
          remainingSize -= resp.hits.hits.length;
        }

        return start.then(function () {
          var prom = mergeRequestStats(self.requestStats, resp);
          return prom;
        })
        .then(function () {
          if (_.isFunction(self.requestHandlers.each)) {
            return self.requestHandlers.each(resp, req);
          }
        })
        .then(function () {
          var mergedCopy = _.omit(self.requestStats, '_bucketIndex');
          req.resp = mergedCopy;

          if (_.isFunction(self.requestHandlers.eachMerged)) {
            // resolve with a "shallow clone" that omits the _aggIndex
            // which helps with watchers and protects the index
            return self.requestHandlers.eachMerged(mergedCopy, req);
          }
        })
        .then(function () {
          self.completedQueue.push(index);
          if (self.queue.length) return self._processQueue(req, state, remainingSize, loopCount);
          return self._processQueueComplete(req, loopCount);
        });
      });
    };

    segmentedFetch.prototype._processQueueComplete = function (req, loopCount) {
      req.complete = true;
      req.ms = req.moment.diff() * -1;
      req.source.activeFetchCount -= 1;
      return (loopCount + 1);
    };

    function mergeRequestStats(requestStats, resp) {
      requestStats.took += resp.took;
      requestStats.hits.total = Math.max(requestStats.hits.total, resp.hits.total);
      requestStats.hits.max_score = Math.max(requestStats.hits.max_score, resp.hits.max_score);
      [].push.apply(requestStats.hits.hits, resp.hits.hits);

      if (!resp.aggregations) return;

      var aggKey = _.find(Object.keys(resp.aggregations), function (key) {
        return key.substr(0, 4) === 'agg_';
      });

      // start merging aggregations
      if (!requestStats.aggregations) {
        requestStats.aggregations = {};
        requestStats.aggregations[aggKey] = {
          buckets: []
        };
        requestStats._bucketIndex = {};
      }

      resp.aggregations[aggKey].buckets.forEach(function (bucket) {
        var mbucket = requestStats._bucketIndex[bucket.key];
        if (mbucket) {
          mbucket.doc_count += bucket.doc_count;
          return;
        }

        mbucket = requestStats._bucketIndex[bucket.key] = bucket;
        requestStats.aggregations[aggKey].buckets.push(mbucket);
      });
    }

    return segmentedFetch;
  };
});