/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { overwrite } from '../../helpers';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { bucketTransform } from '../../helpers/bucket_transform';
import { getIntervalAndTimefield } from '../../get_interval_and_timefield';
import { calculateAggRoot } from './calculate_agg_root';

export function metricBuckets(
  req,
  panel,
  esQueryConfig,
  indexPatternObject,
  capabilities,
  { barTargetUiSettings }
) {
  return (next) => (doc) => {
    const { interval } = getIntervalAndTimefield(panel, {}, indexPatternObject);
    const { intervalString } = getBucketSize(req, interval, capabilities, barTargetUiSettings);

    panel.series.forEach((column) => {
      const aggRoot = calculateAggRoot(doc, column);
      column.metrics
        .filter((row) => !/_bucket$/.test(row.type) && !/^series/.test(row.type))
        .forEach((metric) => {
          const fn = bucketTransform[metric.type];
          if (fn) {
            try {
              const bucket = fn(metric, column.metrics, intervalString);
              overwrite(doc, `${aggRoot}.timeseries.aggs.${metric.id}`, bucket);
            } catch (e) {
              // meh
            }
          }
        });
    });
    return next(doc);
  };
}
