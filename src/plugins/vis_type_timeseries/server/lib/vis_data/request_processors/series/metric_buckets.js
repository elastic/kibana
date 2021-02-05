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
import { UI_SETTINGS } from '../../../../../../data/common';

export function metricBuckets(
  req,
  panel,
  series,
  esQueryConfig,
  indexPatternObject,
  capabilities,
  uiSettings
) {
  return (next) => async (doc) => {
    const barTargetUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);

    const { interval } = getIntervalAndTimefield(panel, series, indexPatternObject);
    const { intervalString } = getBucketSize(req, interval, capabilities, barTargetUiSettings);

    series.metrics
      .filter((row) => !/_bucket$/.test(row.type) && !/^series/.test(row.type))
      .forEach((metric) => {
        const fn = bucketTransform[metric.type];
        if (fn) {
          try {
            const bucket = fn(metric, series.metrics, intervalString);
            overwrite(doc, `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}`, bucket);
          } catch (e) {
            // meh
          }
        }
      });
    return next(doc);
  };
}
