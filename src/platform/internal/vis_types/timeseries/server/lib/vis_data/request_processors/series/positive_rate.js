/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getBucketSize } from '../../helpers/get_bucket_size';
import { bucketTransform } from '../../helpers/bucket_transform';
import { overwrite } from '../../helpers';
import { UI_SETTINGS } from '@kbn/data-plugin/common';

export const filter = (metric) => metric.type === 'positive_rate';

export const createPositiveRate = (doc, intervalString, aggRoot) => (metric) => {
  const maxFn = bucketTransform.max;
  const derivativeFn = bucketTransform.derivative;
  const positiveOnlyFn = bucketTransform.positive_only;

  const maxMetric = {
    id: `${metric.id}-positive-rate-max`,
    type: 'max',
    field: metric.field,
  };
  const derivativeMetric = {
    id: `${metric.id}-positive-rate-derivative`,
    type: 'derivative',
    field: `${metric.id}-positive-rate-max`,
    unit: metric.unit,
  };
  const positiveOnlyMetric = {
    id: metric.id,
    type: 'positive_only',
    field: `${metric.id}-positive-rate-derivative`,
  };

  const fakeSeriesMetrics = [maxMetric, derivativeMetric, positiveOnlyMetric];

  const maxBucket = maxFn(maxMetric, fakeSeriesMetrics, intervalString);
  const derivativeBucket = derivativeFn(derivativeMetric, fakeSeriesMetrics, intervalString);
  const positiveOnlyBucket = positiveOnlyFn(positiveOnlyMetric, fakeSeriesMetrics, intervalString);

  overwrite(doc, `${aggRoot}.timeseries.aggs.${metric.id}-positive-rate-max`, maxBucket);
  overwrite(
    doc,
    `${aggRoot}.timeseries.aggs.${metric.id}-positive-rate-derivative`,
    derivativeBucket
  );
  overwrite(doc, `${aggRoot}.timeseries.aggs.${metric.id}`, positiveOnlyBucket);
};

export function positiveRate(
  req,
  panel,
  series,
  esQueryConfig,
  seriesIndex,
  capabilities,
  uiSettings,
  buildSeriesMetaParams
) {
  return (next) => async (doc) => {
    const barTargetUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);

    const { interval } = await buildSeriesMetaParams();
    const { intervalString } = getBucketSize(req, interval, capabilities, barTargetUiSettings);

    if (series.metrics.some(filter)) {
      series.metrics
        .filter(filter)
        .forEach(createPositiveRate(doc, intervalString, `aggs.${series.id}.aggs`));
      return next(doc);
    }
    return next(doc);
  };
}
