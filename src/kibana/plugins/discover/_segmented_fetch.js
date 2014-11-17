define(function (require) {
  return function DiscoverSegmentedFetch(es, Private, Promise, Notifier, configFile) {
    var _ = require('lodash');
    var moment = require('moment');
    var searchStrategy = Private(require('components/courier/fetch/strategy/search'));
    var eventName = 'segmented fetch';
    var errors = require('errors');


    var notify = new Notifier({
      location: 'Segmented Fetch'
    });

    // var segmentedFetch = {};
    function segmentedFetch(searchSource) {
      this.searchSource = searchSource;
      this.queue = [];
      this.complete = [];
      this.requestHandlers = {};
      this.activeRequest = null;
      this.notifyEvent = null;
      this.lastRequestPromise = Promise.resolve();
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

      self._stopRequest();

      return (self.lastRequestPromise = self.lastRequestPromise.then(function () {
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
        })
        .then(function () {
          return self._stopRequest();
        });
      }));
    };

    segmentedFetch.prototype.abort = function () {
      this._stopRequest();
      return this.lastRequestPromise;
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

      self._setRequest(req);
      self.notifyEvent = notify.event(eventName);
    };

    segmentedFetch.prototype._stopRequest = function () {
      var self = this;

      self._setRequest();
      self._clearNotification();
      if (self.searchPromise && 'abort' in self.searchPromise) {
        self.searchPromise.abort();
      }
    };

    segmentedFetch.prototype._setRequest = function (req) {
      req = req || null;
      this.activeRequest = req;
    };

    segmentedFetch.prototype._clearNotification = function () {
      var self = this;
      if (_.isFunction(self.notifyEvent)) {
        self.notifyEvent();
      }
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
        total: self.all.length,
        complete: self.complete.length,
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

      self.all = queue.slice(0);
      self.queue = queue;
      self.complete = [];

      return queue;
    };

    segmentedFetch.prototype._createRequest = function () {
      var self = this;
      var req = self.searchSource._createRequest();
      req.moment = moment();
      req.source.activeFetchCount += 1;
      return req;
    };

    segmentedFetch.prototype._executeSearch = function (index, state) {
      var resolve, reject;

      this.searchPromise = new Promise(function () {
        resolve = arguments[0];
        reject = arguments[1];
      });

      var clientPromise = es.search({
        index: index,
        type: state.type,
        ignoreUnavailable: true,
        body: state.body,
        timeout: configFile.shard_timeout
      });

      this.searchPromise.abort = function () {
        clientPromise.abort();
        resolve(false);
      };

      clientPromise.then(resolve)
      .catch(function (err) {
        // don't throw ClusterBlockException errors
        if (err.status === 403 && err.message.match(/ClusterBlockException.+index closed/)) {
          resolve(false);
        } else if (err.body && err.body.message) {
          reject(err.body.message);
        } else {
          reject(err);
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

      return searchStrategy.getSourceStateFromRequest(req)
      .then(function (state) {
        var loopCount = -1;
        return self._processQueue(req, state, remainingSize, loopCount);
      })
      .then(function (count) {
        return req.defer.resolve(count);
      })
      .catch(function (err) {
        req.defer.reject(err);
        return err;
      });
    };

    segmentedFetch.prototype._processQueue = function (req, state, remainingSize, loopCount) {
      var self = this;
      var index = self.queue.shift();

      // abort if request changed (fetch is called twice quickly)
      if (req !== self.activeRequest) {
        return;
      }

      if (remainingSize !== false) {
        state.body.size = remainingSize;
      }

      req.state = state;

      // update the status on every iteration
      self._statusReport(index);

      return self._executeSearch(index, state)
      .then(function (resp) {
        if (resp.timed_out) {
          notify.warning(new errors.SearchTimeout());
        }
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
          self.complete.push(index);
          if (self.queue.length) return self._processQueue(req, state, remainingSize, loopCount);
          return self._processQueueComplete(req, loopCount);
        });
      })
      .catch(function (err) {
        notify.fatal(err);
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

      Object.keys(resp.aggregations).forEach(function (aggKey) {

        if (!requestStats.aggregations) {
          // start merging aggregations
          requestStats.aggregations = {};
          requestStats._bucketIndex = {};
        }

        if (!requestStats.aggregations[aggKey]) {
          requestStats.aggregations[aggKey] = {
            buckets: []
          };
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
      });
    }

    return segmentedFetch;
  };
});