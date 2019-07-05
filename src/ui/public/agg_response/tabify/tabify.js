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
import { TabbedAggResponseWriter } from './_response_writer';
import { TabifyBuckets } from './_buckets';

/**
 * Sets up the ResponseWriter and kicks off bucket collection.
 *
 * @param {AggConfigs} aggs - the agg configs object to which the aggregation response correlates
 * @param {Object} esResponse - response that came back from Elasticsearch
 * @param {Object} respOpts - options object for the ResponseWriter with params set by Courier
 * @param {boolean} respOpts.minimalColumns - setting to true will only return a column for the last bucket/metric instead of one for each level
 * @param {boolean} respOpts.partialRows - vis.params.showPartialRows: determines whether to return rows with incomplete data
 * @param {Object} respOpts.timeRange - time range object, if provided
 */
export function tabifyAggResponse(aggs, esResponse, respOpts = {}) {
  const write = new TabbedAggResponseWriter(aggs, respOpts);

  const topLevelBucket = _.assign({}, esResponse.aggregations, {
    doc_count: esResponse.hits.total
  });

  collectBucket(write, topLevelBucket, '', 1);

  return write.response();
}

/**
 * read an aggregation from a bucket, which *might* be found at key (if
 * the response came in object form), and will recurse down the aggregation
 * tree and will pass the read values to the ResponseWriter.
 *
 * @param {object} bucket - a bucket from the aggResponse
 * @param {undefined|string} key - the key where the bucket was found
 * @returns {undefined}
 */
function collectBucket(write, bucket, key, aggScale) {
  const column = write.aggStack.shift();
  const agg = column.aggConfig;
  const aggInfo = agg.write(write.aggs);
  aggScale *= aggInfo.metricScale || 1;

  switch (agg.type.type) {
    case 'buckets':
      const buckets = new TabifyBuckets(bucket[agg.id], agg.params, write.timeRange);
      if (buckets.length) {
        buckets.forEach(function (subBucket, key) {
          // if the bucket doesn't have value don't add it to the row
          // we don't want rows like: { column1: undefined, column2: 10 }
          const bucketValue = agg.getKey(subBucket, key);
          const hasBucketValue = typeof bucketValue !== 'undefined';
          if (hasBucketValue) {
            write.bucketBuffer.push({ id: column.id, value: bucketValue });
          }
          collectBucket(write, subBucket, agg.getKey(subBucket, key), aggScale);
          if (hasBucketValue) {
            write.bucketBuffer.pop();
          }
        });
      } else if (write.partialRows) {
        // we don't have any buckets, but we do have metrics at this
        // level, then pass all the empty buckets and jump back in for
        // the metrics.
        write.aggStack.unshift(column);
        passEmptyBuckets(write, bucket, key, aggScale);
        write.aggStack.shift();
      } else {
        // we don't have any buckets, and we don't have isHierarchical
        // data, so no metrics, just try to write the row
        write.row();
      }
      break;
    case 'metrics':
      let value = agg.getValue(bucket);
      // since the aggregation could be a non integer (such as a max date)
      // only do the scaling calculation if it is needed.
      if (aggScale !== 1) {
        value *= aggScale;
      }
      write.metricBuffer.push({ id: column.id, value: value });

      if (!write.aggStack.length) {
        // row complete
        write.row();
      } else {
        // process the next agg at this same level
        collectBucket(write, bucket, key, aggScale);
      }

      write.metricBuffer.pop();

      break;
  }

  write.aggStack.unshift(column);
}

// write empty values for each bucket agg, then write
// the metrics from the initial bucket using collectBucket()
function passEmptyBuckets(write, bucket, key, aggScale) {
  const column = write.aggStack.shift();
  const agg = column.aggConfig;

  switch (agg.type.type) {
    case 'metrics':
      // pass control back to collectBucket()
      write.aggStack.unshift(column);
      collectBucket(write, bucket, key, aggScale);
      return;

    case 'buckets':
      passEmptyBuckets(write, bucket, key, aggScale);
  }

  write.aggStack.unshift(column);
}

