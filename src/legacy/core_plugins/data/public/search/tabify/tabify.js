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
import { TabbedAggResponseWriter } from './response_writer';
import { TabifyBuckets } from './buckets';

/**
 * Sets up the ResponseWriter and kicks off bucket collection.
 *
 * @param {AggConfigs} aggs - the agg configs object to which the aggregation response correlates
 * @param {Object} esResponse - response that came back from Elasticsearch
 * @param {Object} respOpts - options object for the ResponseWriter with params set by Courier
 * @param {boolean} respOpts.metricsAtAllLevels - setting to true will produce metrics for every bucket
 * @param {boolean} respOpts.partialRows - setting to true will not remove rows with missing values
 * @param {Object} respOpts.timeRange - time range object, if provided
 */
export function tabifyAggResponse(aggs, esResponse, respOpts = {}) {
  const topLevelBucket = _.assign({}, esResponse.aggregations, {
    doc_count: esResponse.hits.total,
  });
  const write = new TabbedAggResponseWriter(aggs, respOpts);

  let timeRange;

  // Extract the time range object if provided
  if (respOpts.timeRange) {
    const timeRangeKey = Object.keys(respOpts.timeRange)[0];

    if (timeRangeKey) {
      timeRange = {
        name: timeRangeKey,
        ...respOpts.timeRange[timeRangeKey],
      };
    }
  }

  collectBucket(aggs, write, topLevelBucket, '', 1, timeRange);

  return write.response();
}

/**
 * read an aggregation from a bucket, which *might* be found at key (if
 * the response came in object form), and will recurse down the aggregation
 * tree and will pass the read values to the ResponseWriter.
 *
 * @param {AggConfigs} aggs - the agg configs object to which the aggregation response correlates
 * @param {object} bucket - a bucket from the aggResponse
 * @param {undefined|string} key - the key where the bucket was found
 * @param {Object} timeRange - time range object, if provided
 * @returns {undefined}
 */
function collectBucket(aggs, write, bucket, key, aggScale, timeRange) {
  const column = write.columns.shift();
  const agg = column.aggConfig;
  const aggInfo = agg.write(aggs);
  aggScale *= aggInfo.metricScale || 1;

  switch (agg.type.type) {
    case 'buckets':
      const tabifyBuckets = new TabifyBuckets(bucket[agg.id], agg.params, timeRange);
      if (tabifyBuckets.length) {
        tabifyBuckets.forEach(function(subBucket, key) {
          // if the bucket doesn't have value don't add it to the row
          // we don't want rows like: { column1: undefined, column2: 10 }
          const bucketValue = agg.getKey(subBucket, key);
          const hasBucketValue = typeof bucketValue !== 'undefined';

          if (hasBucketValue) {
            write.bucketBuffer.push({ id: column.id, value: bucketValue });
          }

          collectBucket(aggs, write, subBucket, agg.getKey(subBucket, key), aggScale, timeRange);

          if (hasBucketValue) {
            write.bucketBuffer.pop();
          }
        });
      } else if (write.partialRows) {
        // we don't have any buckets, but we do have metrics at this
        // level, then pass all the empty buckets and jump back in for
        // the metrics.
        write.columns.unshift(column);
        passEmptyBuckets(aggs, write, bucket, key, aggScale, timeRange);
        write.columns.shift();
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

      if (!write.columns.length) {
        // row complete
        write.row();
      } else {
        // process the next agg at this same level
        collectBucket(aggs, write, bucket, key, aggScale, timeRange);
      }

      write.metricBuffer.pop();

      break;
  }

  write.columns.unshift(column);
}

// write empty values for each bucket agg, then write
// the metrics from the initial bucket using collectBucket()
function passEmptyBuckets(aggs, write, bucket, key, aggScale, timeRange) {
  const column = write.columns.shift();
  const agg = column.aggConfig;

  switch (agg.type.type) {
    case 'metrics':
      // pass control back to collectBucket()
      write.columns.unshift(column);
      collectBucket(aggs, write, bucket, key, aggScale, timeRange);
      return;

    case 'buckets':
      passEmptyBuckets(aggs, write, bucket, key, aggScale, timeRange);
  }

  write.columns.unshift(column);
}
