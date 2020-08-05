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

import { get } from 'lodash';
import { TabbedAggResponseWriter } from './response_writer';
import { TabifyBuckets } from './buckets';
import { TabbedResponseWriterOptions } from './types';
import { AggResponseBucket } from './types';
import { AggGroupNames, IAggConfigs } from '../aggs';

/**
 * Sets up the ResponseWriter and kicks off bucket collection.
 */
export function tabifyAggResponse(
  aggConfigs: IAggConfigs,
  esResponse: Record<string, any>,
  respOpts?: Partial<TabbedResponseWriterOptions>
) {
  /**
   * read an aggregation from a bucket, which *might* be found at key (if
   * the response came in object form), and will recurse down the aggregation
   * tree and will pass the read values to the ResponseWriter.
   */
  function collectBucket(
    aggs: IAggConfigs,
    write: TabbedAggResponseWriter,
    bucket: AggResponseBucket,
    key: string,
    aggScale: number
  ) {
    const column = write.columns.shift();

    if (column) {
      const agg = column.aggConfig;
      const aggInfo = agg.write(aggs);
      aggScale *= aggInfo.metricScale || 1;

      switch (agg.type.type) {
        case AggGroupNames.Buckets:
          const aggBucket = get(bucket, agg.id);
          const tabifyBuckets = new TabifyBuckets(aggBucket, agg.params, respOpts?.timeRange);

          if (tabifyBuckets.length) {
            tabifyBuckets.forEach((subBucket, tabifyBucketKey) => {
              // if the bucket doesn't have value don't add it to the row
              // we don't want rows like: { column1: undefined, column2: 10 }
              const bucketValue = agg.getKey(subBucket, tabifyBucketKey);
              const hasBucketValue = typeof bucketValue !== 'undefined';

              if (hasBucketValue) {
                write.bucketBuffer.push({ id: column.id, value: bucketValue });
              }

              collectBucket(
                aggs,
                write,
                subBucket,
                agg.getKey(subBucket, tabifyBucketKey),
                aggScale
              );

              if (hasBucketValue) {
                write.bucketBuffer.pop();
              }
            });
          } else if (respOpts?.partialRows) {
            // we don't have any buckets, but we do have metrics at this
            // level, then pass all the empty buckets and jump back in for
            // the metrics.
            write.columns.unshift(column);
            passEmptyBuckets(aggs, write, bucket, key, aggScale);
            write.columns.shift();
          } else {
            // we don't have any buckets, and we don't have isHierarchical
            // data, so no metrics, just try to write the row
            write.row();
          }
          break;
        case AggGroupNames.Metrics:
          let value = agg.getValue(bucket);
          // since the aggregation could be a non integer (such as a max date)
          // only do the scaling calculation if it is needed.
          if (aggScale !== 1) {
            value *= aggScale;
          }
          write.metricBuffer.push({ id: column.id, value });

          if (!write.columns.length) {
            // row complete
            write.row();
          } else {
            // process the next agg at this same level
            collectBucket(aggs, write, bucket, key, aggScale);
          }

          write.metricBuffer.pop();

          break;
      }

      write.columns.unshift(column);
    }
  }

  // write empty values for each bucket agg, then write
  // the metrics from the initial bucket using collectBucket()
  function passEmptyBuckets(
    aggs: IAggConfigs,
    write: TabbedAggResponseWriter,
    bucket: AggResponseBucket,
    key: string,
    aggScale: number
  ) {
    const column = write.columns.shift();

    if (column) {
      const agg = column.aggConfig;

      switch (agg.type.type) {
        case AggGroupNames.Metrics:
          // pass control back to collectBucket()
          write.columns.unshift(column);
          collectBucket(aggs, write, bucket, key, aggScale);
          return;

        case AggGroupNames.Buckets:
          passEmptyBuckets(aggs, write, bucket, key, aggScale);
      }

      write.columns.unshift(column);
    }
  }

  const write = new TabbedAggResponseWriter(aggConfigs, respOpts || {});
  const topLevelBucket: AggResponseBucket = {
    ...esResponse.aggregations,
    doc_count: esResponse.hits.total,
  };

  collectBucket(aggConfigs, write, topLevelBucket, '', 1);

  return write.response();
}
