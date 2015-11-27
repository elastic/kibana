define(function (require) {
  return function CourierSegmentedReqProvider(es, Private, Promise, Notifier, timefilter, config) {
    var _ = require('lodash');
    var SearchReq = Private(require('ui/courier/fetch/request/search'));
    var SegmentedHandle = Private(require('ui/courier/fetch/request/_segmented_handle'));

    var notify = new Notifier({
      location: 'Segmented Fetch'
    });

    _.class(SegmentedReq).inherits(SearchReq);
    function SegmentedReq(source, defer, initFn) {
      SearchReq.call(this, source, defer);

      this.type = 'segmented';

      // segmented request specific state
      this._initFn = initFn;
      this._desiredSize = false;
      this._maxSegments = config.get('courier:maxSegmentCount');
      this._hitsReceived = 0;
      this._direction = 'desc';
      this._queueCreated = false;
      this._handle = new SegmentedHandle(this);

      // prevent the source from changing between requests,
      // all calls will return the same promise
      this._getFlattenedSource = _.once(this._getFlattenedSource);
    }

    /*********
     ** SearchReq overrides
     *********/

    SegmentedReq.prototype.start = function () {
      var self = this;

      this._complete = [];
      this._active = null;
      this._segments = [];
      this._all = [];
      this._queue = [];

      this._mergedResp = {
        took: 0,
        hits: {
          hits: [],
          total: 0,
          max_score: 0
        }
      };

      // give the request consumer a chance to receive each segment and set
      // parameters via the handle
      if (_.isFunction(this._initFn)) this._initFn(this._handle);
      return this._createQueue().then(function (queue) {
        self._all = queue.slice(0);

        // Send the initial fetch status
        self._reportStatus();

        return SearchReq.prototype.start.call(self);
      });
    };

    SegmentedReq.prototype.continue = function () {
      return this._reportStatus();
    };

    SegmentedReq.prototype.getFetchParams = function () {
      var self = this;

      return self._getFlattenedSource()
      .then(function (flatSource) {
        var params = _.cloneDeep(flatSource);

        // calculate the number of indices to fetch in this request in order to prevent
        // more than self._maxSegments requests. We use Math.max(1, n) to ensure that each request
        // has at least one index pattern, and Math.floor() to make sure that if the
        // number of indices does not round out evenly the extra index is tacked onto the last
        // request, making sure the first request returns faster.
        var remainingSegments = self._maxSegments - self._segments.length;
        var indexCount = Math.max(1, Math.floor(self._queue.length / remainingSegments));
        params.index = self._active = self._queue.splice(0, indexCount);

        if (self._desiredSize !== false) {
          params.body.size = Math.max(self._desiredSize - self._hitsReceived, 0);
        }

        if (params.body.size === 0) params.search_type = 'count';

        return params;
      });
    };

    SegmentedReq.prototype.handleResponse = function (resp) {
      return this._consumeSegment(resp);
    };

    SegmentedReq.prototype.filterError = function (resp) {
      if (/ClusterBlockException.*index\sclosed/.test(resp.error)) {
        this._consumeSegment(false);
        return true;
      }
    };

    SegmentedReq.prototype.isIncomplete = function () {
      var queueNotCreated = !this._queueCreated;
      var queueNotEmpty = this._queue.length > 0;
      return queueNotCreated || queueNotEmpty;
    };

    SegmentedReq.prototype.clone = function () {
      return new SegmentedReq(this.source, this.defer, this._initFn);
    };

    SegmentedReq.prototype.complete = function () {
      this._reportStatus();
      this._handle.emit('complete');
      return SearchReq.prototype.complete.call(this);
    };


    /*********
     ** SegmentedReq specific methods
     *********/

    /**
     * Set the sort total number of segments to emit
     *
     * @param {number}
     */
    SegmentedReq.prototype.setMaxSegments = function (maxSegments) {
      this._maxSegments = Math.max(_.parseInt(maxSegments), 1);
    };

    /**
     * Set the sort direction for the request.
     *
     * @param {string} dir - one of 'asc' or 'desc'
     */
    SegmentedReq.prototype.setDirection = function (dir) {
      switch (dir) {
        case 'asc':
        case 'desc':
          return (this._direction = dir);
        default:
          throw new TypeError('unknown sort direction "' + dir + '"');
      }
    };

    /**
     * Set the sort total number of documents to
     * emit
     *
     * Setting to false will not limit the documents,
     * if a number is set the size of the request to es
     * will be updated on each new request
     *
     * @param {number|false}
     */
    SegmentedReq.prototype.setSize = function (totalSize) {
      this._desiredSize = _.parseInt(totalSize) || false;
    };

    SegmentedReq.prototype._createQueue = function () {
      var self = this;
      var timeBounds = timefilter.getBounds();
      var indexPattern = self.source.get('index');
      self._queueCreated = false;

      return indexPattern.toIndexList(timeBounds.min, timeBounds.max, self._direction)
      .then(function (queue) {
        if (!_.isArray(queue)) queue = [queue];

        self._queue = queue;
        self._queueCreated = true;

        return queue;
      });
    };

    SegmentedReq.prototype._reportStatus = function () {
      return this._handle.emit('status', {
        total: this._queueCreated ? this._all.length : NaN,
        complete: this._queueCreated ? this._complete.length : NaN,
        remaining: this._queueCreated ? this._queue.length : NaN,
        hitCount: this._queueCreated ? this._mergedResp.hits.hits.length : NaN
      });
    };

    SegmentedReq.prototype._getFlattenedSource = function () {
      return this.source._flatten();
    };

    SegmentedReq.prototype._consumeSegment = function (seg) {
      var index = this._active;
      this._complete.push(index);
      if (!seg) return; // segment was ignored/filtered, don't store it

      var hadHits = _.get(this._mergedResp, 'hits.hits.length') > 0;
      var gotHits = _.get(seg, 'hits.hits.length') > 0;
      var firstHits = !hadHits && gotHits;
      var haveHits = hadHits || gotHits;

      this._mergeSegment(seg);
      this.resp = _.omit(this._mergedResp, '_bucketIndex');
      this._hitsReceived += seg.hits.hits.length;

      if (firstHits) this._handle.emit('first', seg);
      if (gotHits)   this._handle.emit('segment', seg);
      if (haveHits)  this._handle.emit('mergedSegment', this.resp);
    };

    SegmentedReq.prototype._mergeSegment = notify.timed('merge response segment', function (seg) {
      var merged = this._mergedResp;

      this._segments.push(seg);

      merged.took += seg.took;
      merged.hits.total += seg.hits.total;
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
