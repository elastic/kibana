define(function (require) {
  return function CourierSegmentedReqProvider(es, Private, Promise, Notifier, timefilter, config) {
    let _ = require('lodash');
    let isNumber = require('lodash').isNumber;
    let SearchReq = Private(require('ui/courier/fetch/request/search'));
    let SegmentedHandle = Private(require('ui/courier/fetch/request/_segmented_handle'));

    let notify = new Notifier({
      location: 'Segmented Fetch'
    });

    _.class(SegmentedReq).inherits(SearchReq);
    function SegmentedReq(source, defer, initFn) {
      SearchReq.call(this, source, defer);

      this.type = 'segmented';

      // segmented request specific state
      this._initFn = initFn;

      this._desiredSize = null;
      this._maxSegments = config.get('courier:maxSegmentCount');
      this._direction = 'desc';
      this._sortFn = null;
      this._queueCreated = false;
      this._handle = new SegmentedHandle(this);

      this._hitWindow = null;

      // prevent the source from changing between requests,
      // all calls will return the same promise
      this._getFlattenedSource = _.once(this._getFlattenedSource);
    }

    /*********
     ** SearchReq overrides
     *********/

    SegmentedReq.prototype.start = function () {
      let self = this;

      SearchReq.prototype.start.call(this);

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
        if (self.stopped) return;

        self._all = queue.slice(0);

        // Send the initial fetch status
        self._reportStatus();
      });
    };

    SegmentedReq.prototype.continue = function () {
      return this._reportStatus();
    };

    SegmentedReq.prototype.getFetchParams = function () {
      let self = this;

      return self._getFlattenedSource().then(function (flatSource) {
        let params = _.cloneDeep(flatSource);

        // calculate the number of indices to fetch in this request in order to prevent
        // more than self._maxSegments requests. We use Math.max(1, n) to ensure that each request
        // has at least one index pattern, and Math.floor() to make sure that if the
        // number of indices does not round out evenly the extra index is tacked onto the last
        // request, making sure the first request returns faster.
        let remainingSegments = self._maxSegments - self._segments.length;
        let indexCount = Math.max(1, Math.floor(self._queue.length / remainingSegments));

        let indices = self._active = self._queue.splice(0, indexCount);
        params.index = _.pluck(indices, 'index');

        if (isNumber(self._desiredSize)) {
          params.body.size = self._pickSizeForIndices(indices);
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
      let queueNotCreated = !this._queueCreated;
      let queueNotEmpty = this._queue.length > 0;
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
     * Set the function that will be used to sort the rows
     *
     * @param {fn}
     */
    SegmentedReq.prototype.setSortFn = function (sortFn) {
      this._sortFn = sortFn;
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
      this._desiredSize = _.parseInt(totalSize);
      if (isNaN(this._desiredSize)) this._desiredSize = null;
    };

    SegmentedReq.prototype._createQueue = function () {
      let self = this;
      let timeBounds = timefilter.getBounds();
      let indexPattern = self.source.get('index');
      self._queueCreated = false;

      return indexPattern.toDetailedIndexList(timeBounds.min, timeBounds.max, self._direction)
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
      let index = this._active;
      this._complete.push(index);
      if (!seg) return; // segment was ignored/filtered, don't store it

      let hadHits = _.get(this._mergedResp, 'hits.hits.length') > 0;
      let gotHits = _.get(seg, 'hits.hits.length') > 0;
      let firstHits = !hadHits && gotHits;
      let haveHits = hadHits || gotHits;

      this._mergeSegment(seg);
      this.resp = _.omit(this._mergedResp, '_bucketIndex');

      if (firstHits) this._handle.emit('first', seg);
      if (gotHits)   this._handle.emit('segment', seg);
      if (haveHits)  this._handle.emit('mergedSegment', this.resp);
    };

    SegmentedReq.prototype._mergeHits = function (hits) {
      let mergedHits = this._mergedResp.hits.hits;
      let desiredSize = this._desiredSize;
      let sortFn = this._sortFn;

      _.pushAll(hits, mergedHits);

      if (sortFn) {
        notify.event('resort rows', function () {
          mergedHits.sort(sortFn);
        });
      }

      if (isNumber(desiredSize)) {
        mergedHits = this._mergedResp.hits.hits = mergedHits.slice(0, desiredSize);
      }
    };

    SegmentedReq.prototype._mergeSegment = notify.timed('merge response segment', function (seg) {
      let merged = this._mergedResp;

      this._segments.push(seg);

      merged.took += seg.took;
      merged.hits.total += seg.hits.total;
      merged.hits.max_score = Math.max(merged.hits.max_score, seg.hits.max_score);

      if (_.size(seg.hits.hits)) {
        this._mergeHits(seg.hits.hits);
        this._detectHitsWindow(merged.hits.hits);
      }

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
          let mbucket = merged._bucketIndex[bucket.key];
          if (mbucket) {
            mbucket.doc_count += bucket.doc_count;
            return;
          }

          mbucket = merged._bucketIndex[bucket.key] = bucket;
          merged.aggregations[aggKey].buckets.push(mbucket);
        });
      });
    });

    SegmentedReq.prototype._detectHitsWindow = function (hits) {
      hits = hits || [];
      let indexPattern = this.source.get('index');
      let desiredSize = this._desiredSize;

      let size = _.size(hits);
      if (!isNumber(desiredSize) || size < desiredSize) {
        this._hitWindow = {
          size: size,
          min: -Infinity,
          max: Infinity
        };
        return;
      }

      let min;
      let max;

      hits.forEach(function (deepHit) {
        let hit = indexPattern.flattenHit(deepHit);
        let time = hit[indexPattern.timeFieldName];
        if (min == null || time < min) min = time;
        if (max == null || time > max) max = time;
      });

      this._hitWindow = { size, min, max };
    };

    SegmentedReq.prototype._pickSizeForIndices = function (indices) {
      let hitWindow = this._hitWindow;
      let desiredSize = this._desiredSize;

      if (!isNumber(desiredSize)) return null;
      // we don't have any hits yet, get us more info!
      if (!hitWindow) return desiredSize;
      // the order of documents isn't important, just get us more
      if (!this._sortFn) return Math.max(desiredSize - hitWindow.size, 0);
      // if all of the documents in every index fall outside of our current doc set, we can ignore them.
      let someOverlap = indices.some(function (index) {
        return index.min <= hitWindow.max && hitWindow.min <= index.max;
      });

      return someOverlap ? desiredSize : 0;
    };

    return SegmentedReq;
  };
});
