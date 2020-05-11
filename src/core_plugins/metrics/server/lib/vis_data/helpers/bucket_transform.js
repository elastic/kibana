import parseSettings from './parse_settings';
import getBucketsPath from './get_buckets_path';
function checkMetric(metric, fields) {
  fields.forEach(field => {
    if (!metric[field]) {
      throw new Error(`Metric missing ${field}`);
    }
  });
}

function stdMetric(bucket) {
  checkMetric(bucket, ['type', 'field']);
  const body = {};
  body[bucket.type] = {
    field: bucket.field
  };
  return body;
}

function extendStats(bucket) {
  checkMetric(bucket, ['type', 'field']);
  const body = {
    extended_stats: { field: bucket.field }
  };
  if (bucket.sigma) body.extended_stats.sigma = parseInt(bucket.sigma, 10);
  return body;
}

function extendStatsBucket(bucket, metrics) {
  const bucketsPath = 'timeseries > ' + getBucketsPath(bucket.field, metrics);
  const body = { extended_stats_bucket: { buckets_path: bucketsPath } };
  if (bucket.sigma) body.extended_stats_bucket.sigma = parseInt(bucket.sigma, 10);
  return body;
}

export default {
  count: () => {
    return {
      bucket_script: {
        buckets_path: { count: '_count' },
        script: {
          inline: 'count * 1',
          lang: 'expression'
        },
        gap_policy: 'skip'
      }
    };
  },
  static: (bucket) => {
    checkMetric(bucket, ['value']);
    return {
      bucket_script: {
        buckets_path: { count: '_count' },
        script: {
          inline: bucket.value,
          lang: 'painless'
        },
        gap_policy: 'skip'
      }
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

  percentile_rank: bucket => {
    checkMetric(bucket, ['type', 'field', 'value']);
    const body = {
      percentile_ranks: {
        field: bucket.field,
        values: [bucket.value]
      }
    };
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
    let percents = bucket.percentiles.filter(p => p.value != null).map(p => p.value);
    if (bucket.percentiles.some(p => p.mode === 'band')) {
      percents = percents.concat(bucket.percentiles
        .filter(p => p.percentile)
        .map(p => p.percentile));
    }
    const agg = {
      percentiles: {
        field: bucket.field,
        percents
      }
    };
    return agg;
  },

  derivative: (bucket, metrics, bucketSize) => {
    checkMetric(bucket, ['type', 'field']);
    const body = {
      derivative: {
        buckets_path: getBucketsPath(bucket.field, metrics),
        gap_policy: 'skip', // seems sane
        unit: bucketSize
      }
    };
    if (bucket.gap_policy) body.derivative.gap_policy = bucket.gap_policy;
    if (bucket.unit) body.derivative.unit = /^([\d]+)([shmdwMy]|ms)$/.test(bucket.unit) ? bucket.unit : bucketSize;
    return body;
  },

  serial_diff: (bucket, metrics) => {
    checkMetric(bucket, ['type', 'field']);
    const body = {
      serial_diff: {
        buckets_path: getBucketsPath(bucket.field, metrics),
        gap_policy: 'skip', // seems sane
        lag: 1
      }
    };
    if (bucket.gap_policy) body.serial_diff.gap_policy = bucket.gap_policy;
    if (bucket.lag) body.serial_diff.lag = /^([\d]+)$/.test(bucket.lag) ? bucket.lag : 0;
    return body;
  },

  cumulative_sum: (bucket, metrics) => {
    checkMetric(bucket, ['type', 'field']);
    return {
      cumulative_sum: {
        buckets_path: getBucketsPath(bucket.field, metrics)
      }
    };
  },

  moving_average: (bucket, metrics) => {
    checkMetric(bucket, ['type', 'field']);
    const body = {
      moving_avg: {
        buckets_path: getBucketsPath(bucket.field, metrics),
        model: bucket.model || 'simple',
        gap_policy: 'skip' // seems sane
      }
    };
    if (bucket.gap_policy) body.moving_avg.gap_policy = bucket.gap_policy;
    if (bucket.window) body.moving_avg.window = Number(bucket.window);
    if (bucket.minimize) body.moving_avg.minimize = Boolean(bucket.minimize);
    if (bucket.settings) body.moving_avg.settings = parseSettings(bucket.settings);
    return body;
  },

  calculation: (bucket, metrics) => {
    checkMetric(bucket, ['variables', 'script']);
    const body = {
      bucket_script: {
        buckets_path: bucket.variables.reduce((acc, row) => {
          acc[row.name] = getBucketsPath(row.field, metrics);
          return acc;
        }, {}),
        script: {
          inline: bucket.script,
          lang: 'painless'
        },
        gap_policy: 'skip' // seems sane
      }
    };
    if (bucket.gap_policy) body.bucket_script.gap_policy = bucket.gap_policy;
    return body;
  },

  positive_only: (bucket, metrics) => {
    checkMetric(bucket, ['field', 'type']);
    const body = {
      bucket_script: {
        buckets_path: {
          value: getBucketsPath(bucket.field, metrics)
        },
        script: {
          inline: 'params.value > 0 ? params.value : 0',
          lang: 'painless'
        },
        gap_policy: 'skip' // seems sane
      }
    };
    return body;
  }


};

