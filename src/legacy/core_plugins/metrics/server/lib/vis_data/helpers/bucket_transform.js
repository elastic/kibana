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

import { parseSettings } from './parse_settings';
import { getBucketsPath } from './get_buckets_path';
import { parseInterval } from './parse_interval';
import { set, isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';

function checkMetric(metric, fields) {
  fields.forEach(field => {
    if (!metric[field]) {
      throw new Error(
        i18n.translate('tsvb.metricMissingErrorMessage', {
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
  static: bucket => {
    checkMetric(bucket, ['value']);
    return {
      bucket_script: {
        buckets_path: { count: '_count' },
        script: {
          source: bucket.value,
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

  top_hit: bucket => {
    checkMetric(bucket, ['type', 'field', 'size']);
    const body = {
      filter: {
        exists: { field: bucket.field },
      },
      aggs: {
        docs: {
          top_hits: {
            size: bucket.size,
            _source: { includes: [bucket.field] },
          },
        },
      },
    };
    if (bucket.order_by) {
      set(body, 'aggs.docs.top_hits.sort', [{ [bucket.order_by]: { order: bucket.order } }]);
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

  percentile: bucket => {
    checkMetric(bucket, ['type', 'field', 'percentiles']);
    let percents = bucket.percentiles.map(p => (p.value ? Number(p.value) : 0));
    if (bucket.percentiles.some(p => p.mode === 'band')) {
      percents = percents.concat(
        bucket.percentiles.filter(p => p.percentile).map(p => p.percentile)
      );
    }
    const agg = {
      percentiles: {
        field: bucket.field,
        percents,
      },
    };
    return agg;
  },

  percentile_rank: bucket => {
    checkMetric(bucket, ['type', 'field', 'values']);

    return {
      percentile_ranks: {
        field: bucket.field,
        values: (bucket.values || []).map(value => (isEmpty(value) ? 0 : value)),
      },
    };
  },

  derivative: (bucket, metrics, bucketSize) => {
    checkMetric(bucket, ['type', 'field']);
    const body = {
      derivative: {
        buckets_path: getBucketsPath(bucket.field, metrics),
        gap_policy: 'skip', // seems sane
        unit: bucketSize,
      },
    };
    if (bucket.gap_policy) body.derivative.gap_policy = bucket.gap_policy;
    if (bucket.unit) {
      body.derivative.unit = /^([\d]+)([shmdwMy]|ms)$/.test(bucket.unit) ? bucket.unit : bucketSize;
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
    if (bucket.lag) {
      body.serial_diff.lag = /^([\d]+)$/.test(bucket.lag) ? bucket.lag : 0;
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
    const body = {
      moving_avg: {
        buckets_path: getBucketsPath(bucket.field, metrics),
        model: bucket.model || 'simple',
        gap_policy: 'skip', // seems sane
      },
    };
    if (bucket.gap_policy) body.moving_avg.gap_policy = bucket.gap_policy;
    if (bucket.window) body.moving_avg.window = Number(bucket.window);
    if (bucket.minimize) body.moving_avg.minimize = Boolean(bucket.minimize);
    if (bucket.predict) body.moving_avg.predict = Number(bucket.predict);
    if (bucket.settings) {
      body.moving_avg.settings = parseSettings(bucket.settings);
    }
    return body;
  },

  calculation: (bucket, metrics, bucketSize) => {
    checkMetric(bucket, ['variables', 'script']);
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
            _interval: parseInterval(bucketSize).asMilliseconds(),
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
