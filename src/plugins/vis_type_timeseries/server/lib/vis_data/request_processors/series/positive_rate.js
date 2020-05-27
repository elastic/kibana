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

import { getBucketSize } from '../../helpers/get_bucket_size';
import { getIntervalAndTimefield } from '../../get_interval_and_timefield';
import { bucketTransform } from '../../helpers/bucket_transform';
import { overwrite } from '../../helpers';

export const filter = (metric) => metric.type === 'positive_rate';

export const createPositiveRate = (doc, intervalString, aggRoot) => (metric) => {
  const maxFn = bucketTransform.max;
  const derivativeFn = bucketTransform.derivative;
  const positiveOnlyFn = bucketTransform.positive_only;

  const maxMetric = { id: `${metric.id}-positive-rate-max`, type: 'max', field: metric.field };
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

export function positiveRate(req, panel, series, esQueryConfig, indexPatternObject, capabilities) {
  return (next) => (doc) => {
    const { interval } = getIntervalAndTimefield(panel, series, indexPatternObject);
    const { intervalString } = getBucketSize(req, interval, capabilities);
    if (series.metrics.some(filter)) {
      series.metrics
        .filter(filter)
        .forEach(createPositiveRate(doc, intervalString, `aggs.${series.id}.aggs`));
      return next(doc);
    }
    return next(doc);
  };
}
