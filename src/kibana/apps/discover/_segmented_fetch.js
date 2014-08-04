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

      getStateFromRequest(req)
      .then(function (state) {
        return (function recurse() {
          i++;
          var index = queue.shift();

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
          .then(function (resp) {
            // abort if fetch is called twice quickly
            if (req !== activeReq) return;

            var start; // promise that starts the chain

            if (i > 0) {
              start = Promise.resolve();
            } else {
              start = Promise.try(function () {
                if (_.isFunction(opts.first)) {
                  return opts.first(resp, req);
                }
              });
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
              if (queue.length) return recurse();

              req.complete = true;
              req.ms = req.moment.diff() * -1;
              req.source.activeFetchCount -= 1;

              return (i + 1);
            });
          });
        }());
      })
      .then(req.defer.resolve, req.defer.reject);

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