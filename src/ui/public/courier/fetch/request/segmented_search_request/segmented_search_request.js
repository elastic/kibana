/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { timefilter } from 'ui/timefilter';
import { SearchRequestProvider } from '../search_request';
import { SegmentedHandleProvider } from './segmented_handle';
import { pushAll } from '../../../../utils/collection';

export function SegmentedSearchRequestProvider(Private, config) {
  const SearchRequest = Private(SearchRequestProvider);
  const SegmentedHandle = Private(SegmentedHandleProvider);

  class SegmentedSearchRequest extends SearchRequest {
    constructor({ source, defer, errorHandler, initFn }) {
      super({ source, defer, errorHandler });

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

    start() {
      return super.start().then(() => {
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
        return this._createQueue();
      })
        .then((queue) => {
          if (this.stopped) return;

          this._all = queue.slice(0);

          // Send the initial fetch status
          return this._reportStatus();
        });
    }

    continue() {
      return this._reportStatus();
    }

    getFetchParams() {
      return this._getFlattenedSource().then(flatSource => {
        const params = _.cloneDeep(flatSource);

        // calculate the number of indices to fetch in this request in order to prevent
        // more than this._maxSegments requests. We use Math.max(1, n) to ensure that each request
        // has at least one index pattern, and Math.floor() to make sure that if the
        // number of indices does not round out evenly the extra index is tacked onto the last
        // request, making sure the first request returns faster.
        const remainingSegments = this._maxSegments - this._segments.length;
        const indexCount = Math.max(1, Math.floor(this._queue.length / remainingSegments));

        const indices = this._active = this._queue.splice(0, indexCount);
        params.index = indices.map(({ index }) => index).join(',');

        if (_.isNumber(this._desiredSize)) {
          params.body.size = this._pickSizeForIndices(indices);
        }

        return params;
      });
    }

    handleResponse(resp) {
      return this._consumeSegment(resp);
    }

    filterError(resp) {
      if (/ClusterBlockException.*index\sclosed/.test(resp.error)) {
        this._consumeSegment(false);
        return true;
      }
    }

    isIncomplete() {
      const queueNotCreated = !this._queueCreated;
      const queueNotEmpty = this._queue.length > 0;
      return queueNotCreated || queueNotEmpty;
    }

    clone() {
      return new SegmentedSearchRequest(this.source, this.defer, this._initFn);
    }

    complete() {
      this._reportStatus();
      this._handle.emit('complete');
      return super.complete();
    }

    /*********
    ** SegmentedSearchRequest specific methods
    *********/


    /**
    * Set the sort total number of segments to emit
    *
    * @param {number}
    */
    setMaxSegments(maxSegments) {
      this._maxSegments = Math.max(_.parseInt(maxSegments), 1);
    }

    /**
    * Set the sort direction for the request.
    *
    * @param {string} dir - one of 'asc' or 'desc'
    */
    setDirection(dir) {
      switch (dir) {
        case 'asc':
        case 'desc':
          return (this._direction = dir);
        default:
          throw new TypeError('unknown sort direction "' + dir + '"');
      }
    }

    /**
    * Set the function that will be used to sort the rows
    *
    * @param {fn}
    */
    setSortFn(sortFn) {
      this._sortFn = sortFn;
    }

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
    setSize(totalSize) {
      this._desiredSize = _.parseInt(totalSize);
      if (isNaN(this._desiredSize)) this._desiredSize = null;
    }

    _createQueue() {
      const timeBounds = timefilter.getBounds();
      const indexPattern = this.source.getField('index');
      this._queueCreated = false;

      return indexPattern.toDetailedIndexList(timeBounds.min, timeBounds.max, this._direction)
        .then(queue => {
          this._queue = queue;
          this._queueCreated = true;
          return queue;
        });
    }

    _reportStatus() {
      return this._handle.emit('status', {
        total: this._queueCreated ? this._all.length : NaN,
        complete: this._queueCreated ? this._complete.length : NaN,
        remaining: this._queueCreated ? this._queue.length : NaN,
        hitCount: this._queueCreated ? this._mergedResp.hits.hits.length : NaN
      });
    }

    _getFlattenedSource() {
      return this.source._flatten();
    }

    _consumeSegment(seg) {
      const index = this._active;
      this._complete.push(index);
      if (!seg) return; // segment was ignored/filtered, don't store it

      const hadHits = _.get(this._mergedResp, 'hits.hits.length') > 0;
      const gotHits = _.get(seg, 'hits.hits.length') > 0;
      const firstHits = !hadHits && gotHits;
      const haveHits = hadHits || gotHits;

      this._mergeSegment(seg);
      this.resp = _.omit(this._mergedResp, '_bucketIndex');

      if (firstHits) this._handle.emit('first', seg);
      gotHits ? this._handle.emit('segment', seg) : this._handle.emit('emptySegment', seg);
      if (haveHits)  this._handle.emit('mergedSegment', this.resp);
    }

    _mergeHits(hits) {
      const mergedHits = this._mergedResp.hits.hits;
      const desiredSize = this._desiredSize;
      const sortFn = this._sortFn;

      pushAll(hits, mergedHits);

      if (sortFn) {
        mergedHits.sort(sortFn);
      }

      if (_.isNumber(desiredSize)) {
        this._mergedResp.hits.hits = mergedHits.slice(0, desiredSize);
      }
    }

    _mergeSegment(seg) {
      const merged = this._mergedResp;

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
    }

    _detectHitsWindow(hits) {
      hits = hits || [];
      const indexPattern = this.source.getField('index');
      const desiredSize = this._desiredSize;

      const size = _.size(hits);
      if (!_.isNumber(desiredSize) || size < desiredSize) {
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
        const hit = indexPattern.flattenHit(deepHit);
        const time = hit[indexPattern.timeFieldName];
        if (min == null || time < min) min = time;
        if (max == null || time > max) max = time;
      });

      this._hitWindow = { size, min, max };
    }

    _pickSizeForIndices(indices) {
      const hitWindow = this._hitWindow;
      const desiredSize = this._desiredSize;

      if (!_.isNumber(desiredSize)) return null;
      // we don't have any hits yet, get us more info!
      if (!hitWindow) return desiredSize;
      // the order of documents isn't important, just get us more
      if (!this._sortFn) return Math.max(desiredSize - hitWindow.size, 0);
      // if all of the documents in every index fall outside of our current doc set, we can ignore them.
      const someOverlap = indices.some(function (index) {
        return index.min <= hitWindow.max && hitWindow.min <= index.max;
      });

      return someOverlap ? desiredSize : 0;
    }
  }

  return SegmentedSearchRequest;
}
