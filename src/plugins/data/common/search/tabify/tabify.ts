/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { TabbedAggResponseWriter } from './response_writer';
import { TabifyBuckets } from './buckets';
import type { TabbedResponseWriterOptions } from './types';
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
      if (agg.getParam('scaleMetricValues')) {
        const aggInfo = agg.write(aggs);
        aggScale *= aggInfo.metricScale || 1;
      }

      switch (agg.type.type) {
        case AggGroupNames.Buckets:
          const aggBucket = get(bucket, agg.id) as Record<string, unknown>;
          const tabifyBuckets = new TabifyBuckets(aggBucket, agg.params, respOpts?.timeRange);
          const precisionError = agg.type.hasPrecisionError?.(aggBucket);

          if (precisionError) {
            // "сolumn" mutation, we have to do this here as this value is filled in based on aggBucket value
            column.hasPrecisionError = true;
          }

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
    doc_count: esResponse.aggregations?.doc_count || esResponse.hits?.total,
  };

  collectBucket(aggConfigs, write, topLevelBucket, '', 1);

  return write.response();
}
