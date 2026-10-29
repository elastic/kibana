/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpecDefinitionsService } from '../../../services';

/* eslint-disable @typescript-eslint/naming-convention */
const significantTermsArgs = {
  __template: {
    field: '',
  },
  field: '{field}',
  size: 10,
  shard_size: 10,
  shard_min_doc_count: 10,
  min_doc_count: 10,
  include: { __one_of: ['*', { pattern: '', flags: '' }] },
  exclude: { __one_of: ['*', { pattern: '', flags: '' }] },
  execution_hint: {
    __one_of: ['map', 'global_ordinals', 'global_ordinals_hash'],
  },
  background_filter: {
    __scope_link: 'GLOBAL.query',
  },
  mutual_information: {
    include_negatives: { __one_of: [true, false] },
  },
  chi_square: {
    include_negatives: { __one_of: [true, false] },
    background_is_superset: { __one_of: [true, false] },
  },
  percentage: {},
  gnd: {
    background_is_superset: { __one_of: [true, false] },
  },
  script_heuristic: {
    __template: {
      script: '_subset_freq/(_superset_freq - _subset_freq + 1)',
    },
    script: {
      // populated by a global rule
    },
  },
};
const simple_metric = {
  __template: { field: '' },
  field: '{field}',
  missing: 0,
  script: {
    // populated by a global rule
  },
};
const field_metric = {
  __template: { field: '' },
  field: '{field}',
};

const gap_policy = {
  __one_of: ['skip', 'insert_zeros'],
};
const simple_pipeline = {
  __template: {
    buckets_path: '',
  },
  buckets_path: '',
  format: '',
  gap_policy,
};
const rules = {
  '*': {
    aggs: {
      __template: {
        NAME: {
          AGG_TYPE: {},
        },
      },
    },
    boxplot: {
      __template: {
        field: '',
      },
      field: '{field}',
      compression: 100,
      missing: 0,
    },
    t_test: {
      a: {
        field: '{field}',
        filter: { __scope_link: 'GLOBAL.query' },
      },
      b: {
        field: '{field}',
        filter: { __scope_link: 'GLOBAL.query' },
      },
      type: { __one_of: ['paired', 'homoscedastic', 'heteroscedastic'] },
      __template: {
        a: {
          field: '',
        },
        b: {
          field: '',
        },
        type: '',
      },
    },
    adjacency_matrix: {
      filters: {},
    },
    diversified_sampler: {
      shard_size: 100,
      field: '{field}',
      max_docs_per_value: 1,
      execution_hint: {
        __template: 'global_ordinals',
        __one_of: ['global_ordinals', 'map', 'bytes_hash'],
      },
    },
    min: simple_metric,
    max: simple_metric,
    avg: simple_metric,
    sum: simple_metric,
    stats: simple_metric,
    extended_stats: simple_metric,
    value_count: {
      __template: {
        field: '',
      },
      field: '{field}',
      script: {
        // populated by a global rule
      },
    },
    global: {},
    filter: { __scope_link: 'GLOBAL.query' },
    filters: {
      __template: {
        filters: {
          NAME: {},
        },
      },
      filters: {
        '*': { __scope_link: 'GLOBAL.query' },
      },
      other_bucket: { __one_of: [true, false] },
      other_bucket_key: '',
    },
    missing: field_metric,
    nested: {
      __template: {
        path: '',
      },
      path: '',
    },
    reverse_nested: {
      __template: {
        path: '',
      },
      path: '',
    },
    terms: {
      __template: {
        field: '',
      },
      field: '{field}',
      size: 10,
      shard_size: 10,
      order: {
        __template: {
          _key: 'asc',
        },
        _key: { __one_of: ['asc', 'desc'] },
        _count: { __one_of: ['asc', 'desc'] },
        '*': { __one_of: ['asc', 'desc'] },
      },
      min_doc_count: 10,
      script: {
        // populated by a global rule
      },
      include: '.*',
      exclude: '.*',
      execution_hint: {
        __one_of: [
          'map',
          'global_ordinals',
          'global_ordinals_hash',
          'global_ordinals_low_cardinality',
        ],
      },
      show_term_doc_count_error: { __one_of: [true, false] },
      collect_mode: { __one_of: ['depth_first', 'breadth_first'] },
      missing: '',
    },
    significant_text: {
      ...significantTermsArgs,
      filter_duplicate_text: '__flag__',
    },
    significant_terms: significantTermsArgs,
    range: {
      __template: {
        field: '',
        ranges: [{ from: 50, to: 100 }],
      },
      field: '{field}',
      ranges: [{ to: 50, from: 100, key: '' }],
      keyed: { __one_of: [true, false] },
      script: {
        // populated by a global rule
      },
    },
    date_range: {
      __template: {
        field: '',
        ranges: [{ from: 'now-10d/d', to: 'now' }],
      },
      field: '{field}',
      format: 'MM-yyy',
      ranges: [{ to: '', from: '', key: '' }],
      keyed: { __one_of: [true, false] },
      script: {
        // populated by a global rule
      },
    },
    ip_prefix: {
      __template: {
        field: '',
      },
      ipPrefix: {
        __template: {
          prefixLength: 1,
          isIpv6: false,
        },
        prefixLength: 1,
        isIpv6: false,
      },
      field: '{field}',
      format: '',
      keyed: { __one_of: [true, false] },
      script: {
        // populated by a global rule
      },
    },
    ip_range: {
      __template: {
        field: '',
        ranges: [{ from: '10.0.0.5', to: '10.0.0.10' }],
      },
      field: '{field}',
      format: 'MM-yyy',
      ranges: [{ to: '', from: '', key: '', mask: '10.0.0.127/25' }],
      keyed: { __one_of: [true, false] },
      script: {
        // populated by a global rule
      },
    },
    histogram: {
      __template: {
        field: 'price',
        interval: 50,
      },
      field: '{field}',
      interval: 50,
      extended_bounds: {
        __template: {
          min: 0,
          max: 50,
        },
        min: 0,
        max: 50,
      },
      min_doc_count: 0,
      order: {
        __template: {
          _key: 'asc',
        },
        _key: { __one_of: ['asc', 'desc'] },
        _count: { __one_of: ['asc', 'desc'] },
        '*': { __one_of: ['asc', 'desc'] },
      },
      keyed: { __one_of: [true, false] },
      missing: 0,
    },
    date_histogram: {
      __template: {
        field: 'date',
        fixed_interval: '1d',
      },
      field: '{field}',
      fixed_interval: {
        __one_of: ['1d', '1h', '1m', '1s', '1ms'],
      },
      min_doc_count: 0,
      extended_bounds: {
        __template: {
          min: 'now/d',
          max: 'now/d',
        },
        min: 'now/d',
        max: 'now/d',
      },
      order: {
        __template: {
          _key: 'asc',
        },
        _key: { __one_of: ['asc', 'desc'] },
        _count: { __one_of: ['asc', 'desc'] },
        '*': { __one_of: ['asc', 'desc'] },
      },
      keyed: { __one_of: [true, false] },
      pre_zone: '-01:00',
      post_zone: '-01:00',
      factor: 1000,
      pre_offset: '1d',
      post_offset: '1d',
      format: 'yyyy-MM-dd',
      time_zone: '00:00',
      missing: '',
      calendar_interval: {
        __one_of: [
          'year',
          'quarter',
          'month',
          'week',
          'day',
          'hour',
          'minute',
          '1y',
          '1q',
          '1M',
          '1w',
          '1d',
          '1h',
          '1m',
        ],
      },
    },
    geo_distance: {
      __template: {
        field: 'location',
        origin: { lat: 52.376, lon: 4.894 },
        ranges: [{ from: 100, to: 300 }],
      },
      field: '{field}',
      origin: { lat: 0.0, lon: 0.0 },
      unit: { __one_of: ['mi', 'km', 'in', 'yd', 'm', 'cm', 'mm'] },
      ranges: [{ from: 50, to: 100 }],
      distance_type: { __one_of: ['arc', 'sloppy_arc', 'plane'] },
    },
    geohash_grid: {
      __template: {
        field: '',
        precision: 5,
        size: 10,
      },
      field: '{field}',
      precision: { __one_of: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
      bounds: {
        top_left: [-180, 90],
        bottom_right: [180, -90],
      },
      size: 10000,
      shard_size: 10,
    },
    geohex_grid: {
      __template: {
        field: '',
        precision: 6,
        size: 10,
      },
      field: '{field}',
      precision: {
        __one_of: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      bounds: {
        top_left: [-180, 90],
        bottom_right: [180, -90],
      },
      size: 10000,
      shard_size: 10,
    },
    geotile_grid: {
      __template: {
        field: '',
        precision: 7,
        size: 10,
      },
      bounds: {
        top_left: [-180, 90],
        bottom_right: [180, -90],
      },
      field: '{field}',
      precision: {
        __one_of: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
          25, 26, 27, 28, 29,
        ],
      },
      size: 10000,
      shard_size: 10,
    },
    composite: {
      __template: {
        sources: [
          {
            NAME: {
              AGG_TYPE: {},
            },
          },
        ],
      },
      sources: [
        {
          __scope_link: '.',
          __template: {
            NAME: {
              AGG_TYPE: {},
            },
          },
        },
      ],
      size: 10,
      after: {},
    },
    percentiles: {
      __template: {
        field: '',
        percents: [1.0, 5.0, 25.0, 50.0, 75.0, 95.0, 99.0],
      },
      field: '{field}',
      percents: {
        __template: [1.0, 5.0, 25.0, 50.0, 75.0, 95.0, 99.0],
        // mark type as list
        __any_of: [],
      },
      script: {
        // populated by a global rule
      },
      compression: 100,
      method: { __one_of: ['hdr', 'tdigest'] },
      missing: 0,
    },
    cardinality: {
      __template: {
        field: '',
      },
      precision_threshold: 100,
      rehash: true,
      script: {
        // populated by a global rule
      },
      missing: '',
    },
    cumulative_cardinality: {
      __template: {
        buckets_path: '',
      },
      buckets_path: '',
      format: '',
    },
    scripted_metric: {
      __template: {
        init_script: '',
        map_script: '',
        combine_script: '',
        reduce_script: '',
      },
      init_script: {
        __scope_link: 'GLOBAL.script',
      },
      map_script: {
        __scope_link: 'GLOBAL.script',
      },
      combine_script: {
        __scope_link: 'GLOBAL.script',
      },
      reduce_script: {
        __scope_link: 'GLOBAL.script',
      },
      lang: 'groovy',
      params: {},
      reduce_params: {},
    },
    geo_bounds: {
      __template: {
        field: '',
      },
      field: '{field}',
      wrap_longitude: { __one_of: [true, false] },
    },
    top_hits: {
      __template: {
        size: 10,
      },
      from: 0,
      size: 10,
      sort: {
        __template: [],
        __scope_link: 'search.sort',
      },
      highlight: {},
      explain: { __one_of: [true, false] },
      _source: {
        __template: '',
        __scope_link: 'search._source',
      },
      script_fields: {
        __scope_link: 'search.script_fields',
      },
      docvalue_fields: ['{field}'],
      version: { __one_of: [true, false] },
    },
    percentile_ranks: {
      __template: {
        field: '',
        values: [10, 15],
      },
      field: '{field}',
      values: [],
      script: {
        // populated by a global rule
      },
      compression: 100,
      method: { __one_of: ['hdr', 'tdigest'] },
      missing: 0,
    },
    sampler: {
      __template: {},
      shard_size: 100,
    },
    children: {
      __template: {
        type: '',
      },
      type: '',
    },
    derivative: simple_pipeline,
    avg_bucket: simple_pipeline,
    max_bucket: simple_pipeline,
    min_bucket: simple_pipeline,
    stats_bucket: simple_pipeline,
    extended_stats_bucket: {
      ...simple_pipeline,
      sigma: '',
    },
    percentiles_bucket: {
      ...simple_pipeline,
      percents: [],
    },
    sum_bucket: simple_pipeline,
    moving_fn: {
      __template: {
        buckets_path: '',
      },
      buckets_path: '',
      format: '',
      gap_policy,
      window: 5,
      model: { __one_of: ['simple', 'linear', 'ewma', 'holt', 'holt_winters'] },
      settings: {
        type: { __one_of: ['add', 'mult'] },
        alpha: 0.5,
        beta: 0.5,
        gamma: 0.5,
        period: 7,
      },
      script: '',
    },
    cumulative_sum: {
      __template: {
        buckets_path: '',
      },
      buckets_path: '',
      format: '',
    },
    serial_diff: {
      __template: {
        buckets_path: '',
        lag: 7,
      },
      lag: 7,
      gap_policy,
      buckets_path: '',
      format: '',
    },
    bucket_script: {
      __template: {
        buckets_path: {},
        script: '',
      },
      buckets_path: {},
      format: '',
      gap_policy,
      script: '',
    },
    bucket_selector: {
      __template: {
        buckets_path: {},
        script: '',
      },
      buckets_path: {},
      gap_policy,
      script: '',
    },
    bucket_sort: {
      __template: {
        sort: [],
      },
      sort: ['{field}'],
      from: 0,
      size: 0,
      gap_policy,
    },
    matrix_stats: {
      __template: {
        fields: [],
      },
      fields: ['{field}'],
    },
    weighted_avg: {
      __template: {
        value: { field: '' },
        weight: { field: '' },
      },
      value: {
        field: '{field}',
        missing: 0,
        script: {
          // populated by a global rule
        },
      },
      weight: {
        field: '{field}',
        missing: 0,
        script: {
          // populated by a global rule
        },
      },
      format: '',
    },
    median_absolute_deviation: {
      __template: { field: '' },
      field: '{field}',
      compression: 1000,
      missing: 0,
      script: {
        // populated by a global rule
      },
    },
    string_stats: {
      __template: { field: '' },
      field: '{field}',
      show_distribution: { __one_of: [true, false] },
      missing: '',
      script: {
        // populated by a global rule
      },
    },
    rate: {
      __template: {},
      field: '{field}',
      unit: {
        __one_of: ['second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'],
      },
      mode: { __one_of: ['sum', 'value_count'] },
      script: {
        // populated by a global rule
      },
    },
    top_metrics: {
      __template: {
        metrics: { field: '' },
        sort: { field: 'desc' },
      },
      metrics: [{ field: '{field}' }],
      sort: {
        __scope_link: 'search.sort',
      },
      size: 1,
    },
    geo_centroid: {
      __template: { field: '' },
      field: '{field}',
    },
    geo_line: {
      __template: {
        point: { field: '' },
        sort: { field: '' },
      },
      point: { field: '{field}' },
      sort: { field: '{field}' },
      include_sort: { __one_of: [true, false] },
      sort_order: { __one_of: ['asc', 'desc'] },
      size: 10000,
    },
    auto_date_histogram: {
      __template: {
        field: 'date',
        buckets: 10,
      },
      field: '{field}',
      buckets: 10,
      format: 'yyyy-MM-dd',
      time_zone: '00:00',
      minimum_interval: {
        __one_of: ['year', 'month', 'day', 'hour', 'minute', 'second'],
      },
      missing: '',
    },
    variable_width_histogram: {
      __template: {
        field: '',
        buckets: 10,
      },
      field: '{field}',
      buckets: 10,
      shard_size: 100,
      initial_buffer: 1000,
    },
    rare_terms: {
      __template: { field: '' },
      field: '{field}',
      max_doc_count: 1,
      precision: 0.001,
      include: '.*',
      exclude: '.*',
      missing: '',
    },
    multi_terms: {
      __template: {
        terms: [{ field: '' }, { field: '' }],
      },
      terms: [{ field: '{field}', missing: '' }],
      size: 10,
      shard_size: 10,
      min_doc_count: 1,
      shard_min_doc_count: 1,
      show_term_doc_count_error: { __one_of: [true, false] },
      order: {
        __template: {
          _count: 'desc',
        },
        _key: { __one_of: ['asc', 'desc'] },
        _count: { __one_of: ['asc', 'desc'] },
        '*': { __one_of: ['asc', 'desc'] },
      },
      collect_mode: { __one_of: ['depth_first', 'breadth_first'] },
    },
    categorize_text: {
      __template: { field: '' },
      field: '{field}',
      max_unique_tokens: 50,
      max_matched_tokens: 5,
      similarity_threshold: 50,
      categorization_filters: [],
      size: 10,
      shard_size: 10,
      min_doc_count: 1,
      shard_min_doc_count: 1,
    },
    random_sampler: {
      __template: { probability: 0.1 },
      probability: 0.1,
      seed: 0,
      shard_seed: 0,
    },
    parent: {
      __template: { type: '' },
      type: '',
    },
    moving_percentiles: {
      __template: {
        buckets_path: '',
        window: 10,
      },
      buckets_path: '',
      window: 10,
      shift: 0,
      format: '',
      gap_policy,
    },
    normalize: {
      __template: {
        buckets_path: '',
        method: 'percent_of_sum',
      },
      buckets_path: '',
      method: {
        __one_of: ['rescale_0_1', 'rescale_0_100', 'percent_of_sum', 'mean', 'z-score', 'softmax'],
      },
      format: '',
    },
    bucket_count_ks_test: {
      __template: {
        buckets_path: '',
      },
      buckets_path: '',
      alternative: {
        __one_of: ['less', 'greater', 'two_sided'],
      },
      sampling_method: { __one_of: ['upper_tail', 'uniform', 'lower_tail'] },
    },
    bucket_correlation: {
      __template: {
        buckets_path: '',
        function: {},
      },
      buckets_path: '',
      function: {
        count_correlation: {
          indicator: {
            expectations: [],
            doc_count: 0,
          },
        },
      },
    },
    cartesian_bounds: field_metric,
    cartesian_centroid: field_metric,
    line: {
      __template: {
        point: { field: '' },
        sort: { field: '' },
      },
      point: { field: '{field}' },
      sort: { field: '{field}' },
      include_sort: { __one_of: [true, false] },
      sort_order: { __one_of: ['asc', 'desc'] },
      size: 10000,
    },
    time_series: {
      __template: {},
      size: 10000,
      keyed: { __one_of: [true, false] },
    },
    frequent_item_sets: {
      __template: {
        fields: [{ field: '' }],
      },
      fields: [{ field: '{field}', include: '.*', exclude: '.*' }],
      minimum_set_size: 1,
      minimum_support: 0.1,
      size: 10,
      filter: { __scope_link: 'GLOBAL.query' },
    },
    change_point: {
      __template: {
        buckets_path: '',
      },
      buckets_path: '',
      format: '',
      gap_policy,
    },
    inference: {
      __template: {
        model_id: '',
        buckets_path: {},
      },
      model_id: '',
      buckets_path: {},
      inference_config: {},
      gap_policy,
    },
  },
};
const { terms, histogram, date_histogram } = rules['*'];

export const aggs = (specService: SpecDefinitionsService) => {
  specService.addGlobalAutocompleteRules('aggregations', rules);
  specService.addGlobalAutocompleteRules('aggs', rules);
  specService.addGlobalAutocompleteRules('groupByAggs', {
    '*': { terms, histogram, date_histogram },
  });
};
