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

export function tabifyAggResponse(aggs, esResponse, respOpts = {}) {
  const write = new TabbedAggResponseWriter(aggs, respOpts);

  const topLevelBucket = _.assign({}, esResponse.aggregations, {
    doc_count: esResponse.hits.total
  });

  collectBucket(write, topLevelBucket, '', 1);

  return write.response();
}

/**
 * read an aggregation from a bucket, which is *might* be found at key (if
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
      const buckets = new TabifyBuckets(bucket[agg.id], agg.params);
      if (buckets.length) {
        buckets.forEach(function (subBucket, key) {
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
      } else if (write.partialRows && write.metricsForAllBuckets && write.minimalColumns) {
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
      write.rowBuffer[column.id] = value;

      if (!write.aggStack.length) {
        // row complete
        write.row();
      } else {
        // process the next agg at this same level
        collectBucket(write, bucket, key, aggScale);
      }

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

