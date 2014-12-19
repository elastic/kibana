define(function (require) {
  return function CourierSegmentedReqProvider(es, Private, Promise, Notifier, timefilter) {
    var _ = require('lodash');
    var SearchReq = Private(require('components/courier/fetch/request/search'));
    var requestQueue = Private(require('components/courier/_request_queue'));
    var SegmentedHandle = Private(require('components/courier/fetch/request/_segmented_handle'));

    var notify = new Notifier({
      location: 'Segmented Fetch'
    });

    _(SegmentedReq).inherits(SearchReq);
    function SegmentedReq(source, defer, initFn) {
      SearchReq.call(this, source, defer);

      this.type = 'segmented';

      // segmented request specific state
      this._initFn = initFn;
      this._totalSize = false;
      this._direction = 'desc';
      this._handle = new SegmentedHandle(this);

      // give the request consumer a chance to receive each segment and set
      // parameters via the handle
      if (_.isFunction(initFn)) initFn(this._handle);

      this._remainingSize = this._totalSize !== false ? this._totalSize : false;
      this._createQueue();
      this._all = this._queue.slice(0);
      this._complete = [];
      this._active = null;
      this._segments = [];

      this._mergedResp = {
        took: 0,
        hits: {
          hits: [],
          total: 0,
          max_score: 0
        }
      };

      // prevent the source from changing between requests
      this._flattenSource = _.once(function () { return this.source._flatten(); });

      // send out the initial status
      this._reportStatus();
    }

    /*********
     ** SearchReq overrides
     *********/

    SegmentedReq.prototype.start = function () {
      // update the status on every iteration
      this._reportStatus();
      return SearchReq.prototype.start.call(this);
    };

    SegmentedReq.prototype.continue = function () {
      return this._reportStatus();
    };

    SegmentedReq.prototype.getFetchParams = function () {
      var self = this;

      return self._flattenSource()
      .then(function (flatSource) {
        var params = _.cloneDeep(flatSource);
        var index = self._active = self._queue.shift();

        params.index = index;

        if (self._remainingSize !== false) {
          params.body.size = self._remainingSize;
        }

        return params;
      });
    };

    SegmentedReq.prototype.handleResponse = function (resp) {
      return this._consumeSegment(resp);
    };

    SegmentedReq.prototype.isIncomplete = function () {
      return this._queue.length > 0;
    };

    SegmentedReq.prototype.clone = function () {
      return new SegmentedReq(this.source, this.defer, this._initFn);
    };

    SegmentedReq.prototype.complete = function () {
      return SearchReq.prototype.complete.call(this);
    };


    /*********
     ** SegmentedReq specific methods
     *********/

    SegmentedReq.prototype._createQueue = function () {
      var timeBounds = timefilter.getBounds();
      var indexPattern = this.source.get('index');
      var queue = indexPattern.toIndexList(timeBounds.min, timeBounds.max);

      if (!_.isArray(queue)) queue = [queue];
      if (this._direction === 'desc') queue = queue.reverse();

      return (this._queue = queue);
    };

    SegmentedReq.prototype._reportStatus = function (active) {
      return this._handle.emit('status', {
        total: this._all.length,
        complete: this._complete.length,
        remaining: this._queue.length,
        active: this._active
      });
    };

    SegmentedReq.prototype._consumeSegment = function (seg) {
      this._segments.push(seg);

      var index = this._active;
      var first = this._segments.length === 1;

      this._complete.push(index);

      if (this._remainingSize !== false) {
        this._remainingSize -= seg.hits.hits.length;
      }

      if (seg) {
        this._mergeSegment(seg);
        this.resp = _.omit(this._mergedResp, '_bucketIndex');

        if (first) this._handle.emit('first', seg);
        this._handle.emit('segment', seg);
        this._handle.emit('mergedSegment', this.resp);
      }
    };

    SegmentedReq.prototype._mergeSegment = notify.timed('merge response segment', function (seg) {
      var merged = this._mergedResp;

      merged.took += seg.took;
      merged.hits.total = Math.max(merged.hits.total, seg.hits.total);
      merged.hits.max_score = Math.max(merged.hits.max_score, seg.hits.max_score);
      [].push.apply(merged.hits.hits, seg.hits.hits);

      if (!seg.aggregations) return;

      Object.keys(seg.aggregations).forEach(function (aggKey) {

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

        seg.aggregations[aggKey].buckets.forEach(function (bucket) {
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

    return SegmentedReq;
  };
});