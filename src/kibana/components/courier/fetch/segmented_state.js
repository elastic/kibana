define(function (require) {
  return function CourierSegmentedStateProvider(es, Private, Promise, Notifier, timefilter) {
    var _ = require('lodash');
    var Events = Private(require('factories/events'));
    var pendingRequests = Private(require('components/courier/_pending_requests'));

    var notify = new Notifier({
      location: 'Segmented Fetch'
    });

    _(SegmentedState).inherits(Events);
    function SegmentedState(source, init) {
      SegmentedState.Super.call(this);

      this.source = source;
      this.promiseForFlatSource = this.source._flatten();
      this.totalSize = false;
      this.direction = 'desc';

      if (_.isFunction(init)) {
        init(this);
      }

      this.remainingSize = this.totalSize !== false ? this.totalSize : false;

      this.all = this.getIndexList(this.source, this.direction);
      this.queue = this.all.slice(0);
      this.complete = [];

      this.mergedResponse = {
        took: 0,
        hits: {
          hits: [],
          total: 0,
          max_score: 0
        }
      };

      this.emitChain = Promise.resolve();
      this.emit('status', this._statusReport(null));
    }

    SegmentedState.prototype._statusReport = function (active) {
      return {
        total: this.all.length,
        complete: this.complete.length,
        remaining: this.queue.length,
        active: active
      };
    };

    SegmentedState.prototype.getSourceStateFromRequest = function (req) {
      var self = this;
      return self.promiseForFlatSource.then(function (flatSource) {
        var state = _.cloneDeep(flatSource);
        state.index = self.queue.shift();
        if (self.remainingSize !== false) {
          state.body.size = self.remainingSize;
        }

        // update the status on every iteration
        var initialStatus = self.emit('status', self._statusReport(state.index));

        var resolveRequest = req.resolve;
        req.resolve = function (resp) {
          // wait for inital status event just in case
          return initialStatus.then(function () {
            return Promise.resolve(resp && self._consumeSegment(resp))
            .then(function () {
              req.resp = _.omit(self.mergedResponse, '_bucketIndex');
              self.complete.push(state.index);

              if (self.queue.length) {
                var nextReq = self.source._createRequest(resolveRequest);
                nextReq.strategy = req.strategy;
                nextReq.segmented = self;
                pendingRequests.push(nextReq);
                return;
              }

              return self
              .emit('complete')
              .then(function () {
                return Promise.delay(2000);
              })
              .then(function () {
                resolveRequest(req.resp);
              });
            });
          });

        };

        return state;
      });
    };


    SegmentedState.prototype._consumeSegment = function (resp) {
      var self = this;
      var first = !self.complete.length;
      var last = self;


      if (self.remainingSize !== false) {
        self.remainingSize -= resp.hits.hits.length;
      }

      self._mergeResponse(self.mergedResponse, resp);

      return Promise.all([
        first && self.emit('first', resp),
        self.emit('segment', resp)
      ]);
    };


    SegmentedState.prototype.getIndexList = function () {
      var self = this;
      var timeBounds = timefilter.getBounds();
      var list = self.source.get('index').toIndexList(timeBounds.min, timeBounds.max);

      if (!_.isArray(list)) list = [list];
      if (self.direction === 'desc') list = list.reverse();

      return list;
    };


    SegmentedState.prototype._mergeResponse = notify.timed('merge response segment', function (merged, resp) {
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