define(function (require) {
  return function DiscoverSegmentedFetch(es, Private, Promise, Notifier) {
    var activeReq = null;
    var getStateFromRequest = Private(require('components/courier/fetch/strategy/search')).getSourceStateFromRequest;
    var _ = require('lodash');
    var moment = require('moment');

    var segmentedFetch = {};

    var notify = new Notifier({
      location: 'Segmented Fetch'
    });

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
     * // all callbacks can return a promise to delay furthur processing
     * @param {function} opts.first - a function that will be called for the first segment
     * @param {function} opts.each - a function that will be called for each segment
     * @param {function} opts.eachMerged - a function that will be called with the merged result on each segment
     *
     * @return {Promise}
     */
    segmentedFetch.fetch = function (opts) {
      opts = opts || {};
      var searchSource = opts.searchSource;
      var direction = opts.direction;
      var limitSize = false;
      var remainingSize = false;

      if (opts.totalSize) {
        limitSize = true;
        remainingSize = opts.totalSize;
      }

      var req = searchSource._createRequest();
      req.moment = moment();
      req.source.activeFetchCount += 1;

      // track the req out of scope so that while we are itterating we can
      // ensure we are still relevant
      activeReq = req;

      var queue = searchSource.get('index').toIndexList();
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
      getStateFromRequest(req)
      .then(function (state) {
        return (function recurse() {
          var index = queue.shift();
          active = index;

          reportStatus();

          if (limitSize) {
            state.body.size = remainingSize;
          }
          req.state = state;

          return es.search({
            index: index,
            type: state.type,
            ignoreUnavailable: true,
            body: state.body
          })
          .catch(function (err) {
            if (err.status === 403 && err.message.match(/ClusterBlockException.+index closed/)) {
              return false;
            } else {
              throw err;
            }
          })
          .then(function (resp) {
            // abort if fetch is called twice quickly
            if (req !== activeReq) return;

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
              if (_.isFunction(opts.each)) return opts.each(resp, req);
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

      // start merging aggregations
      if (!merged.aggregations) {
        merged.aggregations = {
          _agg_0: {
            buckets: []
          }
        };
        merged._bucketIndex = {};
      }

      resp.aggregations._agg_0.buckets.forEach(function (bucket) {
        var mbucket = merged._bucketIndex[bucket.key];
        if (mbucket) {
          mbucket.doc_count += bucket.doc_count;
          return;
        }

        mbucket = merged._bucketIndex[bucket.key] = bucket;
        merged.aggregations._agg_0.buckets.push(mbucket);
      });
    }

    return segmentedFetch;
  };
});