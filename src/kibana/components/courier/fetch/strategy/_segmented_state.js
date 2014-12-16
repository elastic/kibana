define(function (require) {
  return function CourierSegmentedStateProvider(es, Private, Promise, Notifier, timefilter) {
    var _ = require('lodash');
    var moment = require('moment');
    var eventName = 'segmented fetch';
    var errors = require('errors');
    var Events = Private(require('factories/events'));
    var pendingRequests = Private(require('components/courier/_pending_requests'));

    var notify = new Notifier({
      location: 'Segmented Fetch'
    });

    _(SegmentedState).inherits(Events);
    function SegmentedState(source, init, finalDefer) {
      SegmentedState.Super.call(this);

      var self = this;

      self.source = source;
      self.promiseForFlatSource = self.source._flatten();

      self.finalDefer = finalDefer;
      self.totalSize = false;
      self.direction = 'desc';

      if (_.isFunction(init)) {
        init(self);
      }

      self.remainingSize = self.totalSize !== false ? self.totalSize : false;

      self.all = self.getIndexList(self.source, self.direction);
      self.queue = self.all.slice(0);
      self.complete = [];

      self.mergedResponse = {
        took: 0,
        hits: {
          hits: [],
          total: 0,
          max_score: 0
        }
      };

      self._statusReport(null);
    }

    SegmentedState.prototype._statusReport = function (active) {
      var self = this;
      var status = {
        total: self.all.length,
        complete: self.complete.length,
        remaining: self.queue.length,
        active: active
      };

      this.emit('status', status);
      return status;
    };

    SegmentedState.prototype.getStateFromRequest = function (req) {
      var self = this;
      return self.promiseForFlatSource.then(function (flatSource) {
        var state = _.cloneDeep(flatSource);
        state.index = self.queue.shift();
        if (self.remainingSize !== false) {
          state.body.size = self.remainingSize;
        }

        // update the status on every iteration
        self._statusReport(state.index);

        var requestersDefer = req.defer;
        var ourDefer = req.defer = Promise.defer();

        ourDefer.promise
        .then(function (resp) {
          // a response was swallowed intentionally. Wait for the next one
          if (!resp) return;

          if (self.remainingSize !== false) {
            self.remainingSize -= resp.hits.hits.length;
          }

          if (!self.complete.length) self.emit('first', resp);
          self.complete.push(state.index);

          self.emit('segment', resp);

          mergeResponse(self.mergedResponse, resp);
          req.resp = _.omit(self.mergedResponse, '_bucketIndex');

          self.emit('mergedSegment', req.resp);

          if (self.queue.length) {
            var nextReq = self.source._createRequest(requestersDefer);
            nextReq.strategy = req.strategy;
            nextReq.segmented = self;

            pendingRequests.push(nextReq);
          } else {

            self.emit('complete');
            requestersDefer.resolve(self.mergedResponse);
          }

          return resp;
        });

        return state;
      });
    };

    SegmentedState.prototype.getIndexList = function () {
      var self = this;
      var timeBounds = timefilter.getBounds();
      var list = self.source.get('index').toIndexList(timeBounds.min, timeBounds.max);

      if (!_.isArray(list)) list = [list];
      if (self.direction === 'desc') list = list.reverse();

      return list;
    };

    var mergeResponse = notify.timed('merge response segment', function (merged, resp) {
      merged.took += resp.took;
      merged.hits.total = Math.max(merged.hits.total, resp.hits.total);
      merged.hits.max_score = Math.max(merged.hits.max_score, resp.hits.max_score);
      [].push.apply(merged.hits.hits, resp.hits.hits);

      if (!resp.aggregations) return;

      Object.keys(resp.aggregations).forEach(function (aggKey) {

        if (!merged.aggregations) {
          // start merging aggregations
          merged.aggregations = {};
          merged._bucketIndex = {};
        }

        if (!merged.aggregations[aggKey]) {
          merged.aggregations[aggKey] = {
            buckets: []
          };
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
      });
    });

    return SegmentedState;
  };
});