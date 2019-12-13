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

/*eslint camelcase: 0*/
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
    __scope_link: 'GLOBAL.filter',
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
  gap_policy: gap_policy,
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
    adjacency_matrix: {
      filters: {},
    },
    diversified_sampler: {
      shard_size: '',
      field: '',
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
    filter: {},
    filters: {
      __template: {
        filters: {
          NAME: {},
        },
      },
      filters: {
        '*': { __scope_link: 'GLOBAL.filter' },
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
        size: 10,
      },
      field: '{field}',
      size: 10,
      shard_size: 10,
      order: {
        __template: {
          _term: 'asc',
        },
        _term: { __one_of: ['asc', 'desc'] },
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
        interval: 'month',
      },
      field: '{field}',
      interval: {
        __one_of: ['year', 'quarter', 'week', 'day', 'hour', 'minute', 'second'],
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
      pre_zone_adjust_large_interval: { __one_of: [true, false] },
      factor: 1000,
      pre_offset: '1d',
      post_offset: '1d',
      format: 'yyyy-MM-dd',
      time_zone: '00:00',
      missing: '',
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
        precision: 3,
      },
      field: '{field}',
      precision: { __one_of: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
      size: 10,
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
      field: '{field}',
      script: {
        // populated by a global rule
      },
      shard_size: 100,
      max_docs_per_value: 3,
      execution_hint: { __one_of: ['map', 'global_ordinals', 'bytes_hash'] },
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
    moving_avg: {
      __template: {
        buckets_path: '',
      },
      buckets_path: '',
      format: '',
      gap_policy: gap_policy,
      window: 5,
      model: { __one_of: ['simple', 'linear', 'ewma', 'holt', 'holt_winters'] },
      settings: {
        type: { __one_of: ['add', 'mult'] },
        alpha: 0.5,
        beta: 0.5,
        gamma: 0.5,
        period: 7,
      },
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
      gap_policy: gap_policy,
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
      gap_policy: gap_policy,
      script: '',
    },
    bucket_selector: {
      __template: {
        buckets_path: {},
        script: '',
      },
      buckets_path: {},
      gap_policy: gap_policy,
      script: '',
    },
    bucket_sort: {
      __template: {
        sort: [],
      },
      sort: ['{field}'],
      from: 0,
      size: 0,
      gap_policy: gap_policy,
    },
    matrix_stats: {
      __template: {
        fields: [],
      },
      fields: ['{field}'],
    },
  },
};
const { terms, histogram, date_histogram } = rules['*'];
export default function (api) {
  api.addGlobalAutocompleteRules('aggregations', rules);
  api.addGlobalAutocompleteRules('aggs', rules);
  api.addGlobalAutocompleteRules('groupByAggs', { '*': { terms, histogram, date_histogram } });
}
