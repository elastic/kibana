/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getBucketsPath } from './get_buckets_path';
import { set } from '@elastic/safer-lodash-set';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { MODEL_SCRIPTS } from './moving_fn_scripts';
import { convertIntervalToUnit } from './unit_to_seconds';

function checkMetric(metric, fields) {
  fields.forEach((field) => {
    if (!metric[field]) {
      throw new Error(
        i18n.translate('visTypeTimeseries.metricMissingErrorMessage', {
          defaultMessage: 'Metric missing {field}',
          values: { field },
        })
      );
    }
  });
}

function stdMetric(bucket) {
  checkMetric(bucket, ['type', 'field']);
  const body = {};
  body[bucket.type] = {
    field: bucket.field,
  };
  return body;
}

function extendStats(bucket) {
  checkMetric(bucket, ['type', 'field']);
  const body = {
    extended_stats: { field: bucket.field },
  };
  if (bucket.sigma) body.extended_stats.sigma = parseInt(bucket.sigma, 10);
  return body;
}

function extendStatsBucket(bucket, metrics) {
  const bucketsPath = 'timeseries>' + getBucketsPath(bucket.field, metrics);
  const body = { extended_stats_bucket: { buckets_path: bucketsPath } };
  if (bucket.sigma) {
    body.extended_stats_bucket.sigma = parseInt(bucket.sigma, 10);
  }
  return body;
}

function getPercentileHdrParam(bucket) {
  return bucket.numberOfSignificantValueDigits
    ? {
        hdr: {
          number_of_significant_value_digits: bucket.numberOfSignificantValueDigits,
        },
      }
    : undefined;
}

export const bucketTransform = {
  count: () => {
    return {
      bucket_script: {
        buckets_path: { count: '_count' },
        script: {
          source: 'count * 1',
          lang: 'expression',
        },
        gap_policy: 'skip',
      },
    };
  },
  static: (bucket) => {
    checkMetric(bucket, ['value']);
    // Anything containing a decimal point or an exponent is considered decimal value
    const isDecimalValue = Boolean(bucket.value.match(/[.e]/i));
    return {
      bucket_script: {
        buckets_path: { count: '_count' },
        script: {
          source: isDecimalValue ? bucket.value : `${bucket.value}L`,
          lang: 'painless',
        },
        gap_policy: 'skip',
      },
    };
  },
  avg: stdMetric,
  max: stdMetric,
  min: stdMetric,
  sum: stdMetric,
  cardinality: stdMetric,
  value_count: stdMetric,
  sum_of_squares: extendStats,
  variance: extendStats,
  std_deviation: extendStats,

  top_hit: (bucket) => {
    checkMetric(bucket, ['type', 'field', 'size']);
    const body = {
      filter: {
        exists: { field: bucket.field },
      },
      aggs: {
        docs: {
          top_hits: {
            size: bucket.size,
            fields: [bucket.field],
          },
        },
      },
    };
    if (bucket.order_by) {
      const orderField = bucket.order_by;
      set(body, 'aggs.docs.top_hits.sort', [{ [orderField]: { order: bucket.order } }]);
    }
    return body;
  },

  avg_bucket: extendStatsBucket,
  max_bucket: extendStatsBucket,
  min_bucket: extendStatsBucket,
  sum_bucket: extendStatsBucket,
  sum_of_squares_bucket: extendStatsBucket,
  std_deviation_bucket: extendStatsBucket,
  variance_bucket: extendStatsBucket,

  percentile: (bucket) => {
    checkMetric(bucket, ['type', 'field', 'percentiles']);
    let percents = bucket.percentiles.map((p) => (p.value ? Number(p.value) : 0));
    if (bucket.percentiles.some((p) => p.mode === 'band')) {
      percents = percents.concat(
        bucket.percentiles.filter((p) => p.percentile).map((p) => p.percentile)
      );
    }

    return {
      percentiles: {
        field: bucket.field,
        percents,
        ...getPercentileHdrParam(bucket),
      },
    };
  },

  percentile_rank: (bucket) => {
    checkMetric(bucket, ['type', 'field', 'values']);

    return {
      percentile_ranks: {
        field: bucket.field,
        values: (bucket.values || []).map((value) => (isEmpty(value) ? 0 : value)),
        ...getPercentileHdrParam(bucket),
      },
    };
  },

  derivative: (bucket, metrics, intervalString) => {
    checkMetric(bucket, ['type', 'field']);

    const body = {
      derivative: {
        buckets_path: getBucketsPath(bucket.field, metrics),
        gap_policy: 'skip', // seems sane
        unit: intervalString,
      },
    };

    if (bucket.gap_policy) body.derivative.gap_policy = bucket.gap_policy;
    if (bucket.unit) {
      body.derivative.unit = /^([\d]+)([shmdwMy]|ms)$/.test(bucket.unit)
        ? bucket.unit
        : intervalString;
    }

    return body;
  },

  serial_diff: (bucket, metrics) => {
    checkMetric(bucket, ['type', 'field']);
    const body = {
      serial_diff: {
        buckets_path: getBucketsPath(bucket.field, metrics),
        gap_policy: 'skip', // seems sane
        lag: 1,
      },
    };
    if (bucket.gap_policy) body.serial_diff.gap_policy = bucket.gap_policy;
    if (bucket.lag && /^([\d]+)$/.test(bucket.lag)) {
      body.serial_diff.lag = bucket.lag;
    }
    return body;
  },

  cumulative_sum: (bucket, metrics) => {
    checkMetric(bucket, ['type', 'field']);
    return {
      cumulative_sum: {
        buckets_path: getBucketsPath(bucket.field, metrics),
      },
    };
  },

  moving_average: (bucket, metrics) => {
    checkMetric(bucket, ['type', 'field']);

    return {
      moving_fn: {
        buckets_path: getBucketsPath(bucket.field, metrics),
        window: bucket.window,
        script: MODEL_SCRIPTS[bucket.model_type](bucket),
      },
    };
  },

  calculation: (bucket, metrics, intervalString) => {
    checkMetric(bucket, ['variables', 'script']);
    const inMsInterval = convertIntervalToUnit(intervalString, 'ms');

    const body = {
      bucket_script: {
        buckets_path: bucket.variables.reduce((acc, row) => {
          acc[row.name] = getBucketsPath(row.field, metrics);
          return acc;
        }, {}),
        script: {
          source: bucket.script,
          lang: 'painless',
          params: {
            _interval: inMsInterval?.value,
          },
        },
        gap_policy: 'skip', // seems sane
      },
    };
    if (bucket.gap_policy) body.bucket_script.gap_policy = bucket.gap_policy;
    return body;
  },

  positive_only: (bucket, metrics) => {
    checkMetric(bucket, ['field', 'type']);
    const body = {
      bucket_script: {
        buckets_path: {
          value: getBucketsPath(bucket.field, metrics),
        },
        script: {
          source: 'params.value > 0.0 ? params.value : 0.0',
          lang: 'painless',
        },
        gap_policy: 'skip', // seems sane
      },
    };
    return body;
  },
};
