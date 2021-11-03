/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValuesType } from 'utility-types';
import { estypes } from '@elastic/elasticsearch';

type InvalidAggregationRequest = unknown;

// ensures aggregations work with requests where aggregation options are a union type,
// e.g. { transaction_groups: { composite: any } | { terms: any } }.
// Union keys are not included in keyof, but extends iterates over the types in a union.
type ValidAggregationKeysOf<T extends Record<string, any>> = T extends T ? keyof T : never;

type KeyOfSource<T> = Record<
  keyof T,
  (T extends Record<string, { terms: { missing_bucket: true } }> ? null : never) | string | number
>;

type KeysOfSources<T extends any[]> = T extends [infer U, ...infer V]
  ? KeyOfSource<U> & KeysOfSources<V>
  : T extends Array<infer U>
  ? KeyOfSource<U>
  : {};

type CompositeKeysOf<TAggregationContainer extends estypes.AggregationsAggregationContainer> =
  TAggregationContainer extends {
    composite: { sources: [...infer TSource] };
  }
    ? KeysOfSources<TSource>
    : unknown;

type Source = estypes.SearchSourceFilter | boolean | estypes.Fields;

type ValueTypeOfField<T> = T extends Record<string, string | number>
  ? ValuesType<T>
  : T extends Array<infer U>
  ? ValueTypeOfField<U>
  : T extends { field: estypes.Field }
  ? T['field']
  : T extends string | number
  ? T
  : never;

type MaybeArray<T> = T | T[];

type Fields = Required<Required<estypes.SearchRequest>['body']>['fields'];
type DocValueFields = MaybeArray<string | estypes.SearchDocValueField>;

export type SearchHit<
  TSource extends any = unknown,
  TFields extends Fields | undefined = undefined,
  TDocValueFields extends DocValueFields | undefined = undefined
> = Omit<estypes.SearchHit, '_source' | 'fields'> &
  (TSource extends false ? {} : { _source: TSource }) &
  (TFields extends Fields
    ? {
        fields: Partial<Record<ValueTypeOfField<TFields>, unknown[]>>;
      }
    : {}) &
  (TDocValueFields extends DocValueFields
    ? {
        fields: Partial<Record<ValueTypeOfField<TDocValueFields>, unknown[]>>;
      }
    : {});

type HitsOf<
  TOptions extends
    | { _source?: Source; fields?: Fields; docvalue_fields?: DocValueFields }
    | undefined,
  TDocument extends unknown
> = Array<
  SearchHit<
    TOptions extends { _source: false } ? undefined : TDocument,
    TOptions extends { fields: Fields } ? TOptions['fields'] : undefined,
    TOptions extends { docvalue_fields: DocValueFields } ? TOptions['docvalue_fields'] : undefined
  >
>;

type AggregationTypeName = Exclude<
  keyof estypes.AggregationsAggregationContainer,
  'aggs' | 'aggregations'
>;

type AggregationMap = Partial<Record<string, estypes.AggregationsAggregationContainer>>;

type TopLevelAggregationRequest = Pick<
  estypes.AggregationsAggregationContainer,
  'aggs' | 'aggregations'
>;

type MaybeKeyed<
  TAggregationContainer,
  TBucket,
  TKeys extends string = string
> = TAggregationContainer extends Record<string, { keyed: true }>
  ? Record<TKeys, TBucket>
  : { buckets: TBucket[] };

export type AggregateOf<
  TAggregationContainer extends estypes.AggregationsAggregationContainer,
  TDocument
> = (Record<AggregationTypeName, unknown> & {
  adjacency_matrix: {
    buckets: Array<
      {
        key: string;
        doc_count: number;
      } & SubAggregateOf<TAggregationContainer, TDocument>
    >;
  };
  auto_date_histogram: {
    interval: string;
    buckets: Array<
      {
        key: number;
        key_as_string: string;
        doc_count: number;
      } & SubAggregateOf<TAggregationContainer, TDocument>
    >;
  };
  avg: {
    value: number | null;
    value_as_string?: string;
  };
  avg_bucket: {
    value: number | null;
  };
  boxplot: {
    min: number | null;
    max: number | null;
    q1: number | null;
    q2: number | null;
    q3: number | null;
  };
  bucket_script: {
    value: unknown;
  };
  cardinality: {
    value: number;
  };
  children: {
    doc_count: number;
  } & SubAggregateOf<TAggregationContainer, TDocument>;
  composite: {
    after_key: CompositeKeysOf<TAggregationContainer>;
    buckets: Array<
      {
        doc_count: number;
        key: CompositeKeysOf<TAggregationContainer>;
      } & SubAggregateOf<TAggregationContainer, TDocument>
    >;
  };
  cumulative_cardinality: {
    value: number;
  };
  cumulative_sum: {
    value: number;
  };
  date_histogram: MaybeKeyed<
    TAggregationContainer,
    {
      key: number;
      key_as_string: string;
      doc_count: number;
    } & SubAggregateOf<TAggregationContainer, TDocument>
  >;
  date_range: MaybeKeyed<
    TAggregationContainer,
    Partial<{ from: string | number; from_as_string: string }> &
      Partial<{ to: string | number; to_as_string: string }> & {
        doc_count: number;
        key: string;
      }
  >;
  derivative:
    | {
        value: number | null;
      }
    | undefined;
  extended_stats: {
    count: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    sum: number;
    sum_of_squares: number | null;
    variance: number | null;
    variance_population: number | null;
    variance_sampling: number | null;
    std_deviation: number | null;
    std_deviation_population: number | null;
    std_deviation_sampling: number | null;
    std_deviation_bounds: {
      upper: number | null;
      lower: number | null;
      upper_population: number | null;
      lower_population: number | null;
      upper_sampling: number | null;
      lower_sampling: number | null;
    };
  } & (
    | {
        min_as_string: string;
        max_as_string: string;
        avg_as_string: string;
        sum_of_squares_as_string: string;
        variance_population_as_string: string;
        variance_sampling_as_string: string;
        std_deviation_as_string: string;
        std_deviation_population_as_string: string;
        std_deviation_sampling_as_string: string;
        std_deviation_bounds_as_string: {
          upper: string;
          lower: string;
          upper_population: string;
          lower_population: string;
          upper_sampling: string;
          lower_sampling: string;
        };
      }
    | {}
  );
  extended_stats_bucket: {
    count: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    sum: number | null;
    sum_of_squares: number | null;
    variance: number | null;
    variance_population: number | null;
    variance_sampling: number | null;
    std_deviation: number | null;
    std_deviation_population: number | null;
    std_deviation_sampling: number | null;
    std_deviation_bounds: {
      upper: number | null;
      lower: number | null;
      upper_population: number | null;
      lower_population: number | null;
      upper_sampling: number | null;
      lower_sampling: number | null;
    };
  };
  filter: {
    doc_count: number;
  } & SubAggregateOf<TAggregationContainer, TDocument>;
  filters: {
    buckets: TAggregationContainer extends { filters: { filters: any[] } }
      ? Array<
          {
            doc_count: number;
          } & SubAggregateOf<TAggregationContainer, TDocument>
        >
      : TAggregationContainer extends { filters: { filters: Record<string, any> } }
      ? {
          [key in keyof TAggregationContainer['filters']['filters']]: {
            doc_count: number;
          } & SubAggregateOf<TAggregationContainer, TDocument>;
        } & (TAggregationContainer extends { filters: { other_bucket_key: infer TOtherBucketKey } }
          ? Record<
              TOtherBucketKey & string,
              { doc_count: number } & SubAggregateOf<TAggregationContainer, TDocument>
            >
          : unknown) &
          (TAggregationContainer extends { filters: { other_bucket: true } }
            ? { _other: { doc_count: number } & SubAggregateOf<TAggregationContainer, TDocument> }
            : unknown)
      : unknown;
  };
  geo_bounds: {
    top_left: {
      lat: number | null;
      lon: number | null;
    };
    bottom_right: {
      lat: number | null;
      lon: number | null;
    };
  };
  geo_centroid: {
    count: number;
    location: {
      lat: number;
      lon: number;
    };
  };
  geo_distance: MaybeKeyed<
    TAggregationContainer,
    {
      from: number;
      to?: number;
      doc_count: number;
    } & SubAggregateOf<TAggregationContainer, TDocument>
  >;
  geo_hash: {
    buckets: Array<
      {
        doc_count: number;
        key: string;
      } & SubAggregateOf<TAggregationContainer, TDocument>
    >;
  };
  geotile_grid: {
    buckets: Array<
      {
        doc_count: number;
        key: string;
      } & SubAggregateOf<TAggregationContainer, TDocument>
    >;
  };
  global: {
    doc_count: number;
  } & SubAggregateOf<TAggregationContainer, TDocument>;
  histogram: MaybeKeyed<
    TAggregationContainer,
    {
      key: number;
      doc_count: number;
    } & SubAggregateOf<TAggregationContainer, TDocument>
  >;
  ip_range: MaybeKeyed<
    TAggregationContainer,
    {
      key: string;
      from?: string;
      to?: string;
      doc_count: number;
    },
    TAggregationContainer extends { ip_range: { ranges: Array<infer TRangeType> } }
      ? TRangeType extends { key: infer TKeys }
        ? TKeys
        : string
      : string
  >;
  inference: {
    value: number;
    prediction_probability: number;
    prediction_score: number;
  };
  max: {
    value: number | null;
    value_as_string?: string;
  };
  max_bucket: {
    value: number | null;
  };
  min: {
    value: number | null;
    value_as_string?: string;
  };
  min_bucket: {
    value: number | null;
  };
  median_absolute_deviation: {
    value: number | null;
  };
  moving_avg:
    | {
        value: number | null;
      }
    | undefined;
  moving_fn: {
    value: number | null;
  };
  moving_percentiles: TAggregationContainer extends Record<string, { keyed: false }>
    ? Array<{ key: number; value: number | null }>
    : Record<string, number | null> | undefined;
  missing: {
    doc_count: number;
  } & SubAggregateOf<TAggregationContainer, TDocument>;
  multi_terms: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: Array<
      {
        doc_count: number;
        key: string[];
      } & SubAggregateOf<TAggregationContainer, TDocument>
    >;
  };
  nested: {
    doc_count: number;
  } & SubAggregateOf<TAggregationContainer, TDocument>;
  normalize: {
    value: number | null;
    // TODO: should be perhaps based on input? ie when `format` is specified
    value_as_string?: string;
  };
  parent: {
    doc_count: number;
  } & SubAggregateOf<TAggregationContainer, TDocument>;
  percentiles: {
    values: TAggregationContainer extends Record<string, { keyed: false }>
      ? Array<{ key: number; value: number | null }>
      : Record<string, number | null>;
  };
  percentile_ranks: {
    values: TAggregationContainer extends Record<string, { keyed: false }>
      ? Array<{ key: number; value: number | null }>
      : Record<string, number | null>;
  };
  percentiles_bucket: {
    values: TAggregationContainer extends Record<string, { keyed: false }>
      ? Array<{ key: number; value: number | null }>
      : Record<string, number | null>;
  };
  range: MaybeKeyed<
    TAggregationContainer,
    {
      key: string;
      from?: number;
      from_as_string?: string;
      to?: number;
      to_as_string?: string;
      doc_count: number;
    },
    TAggregationContainer extends { range: { ranges: Array<infer TRangeType> } }
      ? TRangeType extends { key: infer TKeys }
        ? TKeys
        : string
      : string
  >;
  rare_terms: Array<
    {
      key: string | number;
      doc_count: number;
    } & SubAggregateOf<TAggregationContainer, TDocument>
  >;
  rate: {
    value: number | null;
  };
  reverse_nested: {
    doc_count: number;
  } & SubAggregateOf<TAggregationContainer, TDocument>;
  sampler: {
    doc_count: number;
  } & SubAggregateOf<TAggregationContainer, TDocument>;
  scripted_metric: {
    value: unknown;
  };
  serial_diff: {
    value: number | null;
    // TODO: should be perhaps based on input? ie when `format` is specified
    value_as_string?: string;
  };
  significant_terms: {
    doc_count: number;
    bg_count: number;
    buckets: Array<
      {
        key: string | number;
        score: number;
        doc_count: number;
        bg_count: number;
      } & SubAggregateOf<TAggregationContainer, TDocument>
    >;
  };
  significant_text: {
    doc_count: number;
    buckets: Array<{
      key: string;
      doc_count: number;
      score: number;
      bg_count: number;
    }>;
  };
  stats: {
    count: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    sum: number;
  } & (
    | {
        min_as_string: string;
        max_as_string: string;
        avg_as_string: string;
        sum_as_string: string;
      }
    | {}
  );
  stats_bucket: {
    count: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    sum: number;
  };
  string_stats: {
    count: number;
    min_length: number | null;
    max_length: number | null;
    avg_length: number | null;
    entropy: number | null;
    distribution: Record<string, number>;
  };
  sum: {
    value: number | null;
    value_as_string?: string;
  };
  sum_bucket: {
    value: number | null;
  };
  terms: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: Array<
      {
        doc_count: number;
        key: string | number;
      } & SubAggregateOf<TAggregationContainer, TDocument>
    >;
  };
  top_hits: {
    hits: {
      total: {
        value: number;
        relation: 'eq' | 'gte';
      };
      max_score: number | null;
      hits: TAggregationContainer extends { top_hits: estypes.AggregationsTopHitsAggregation }
        ? HitsOf<TAggregationContainer['top_hits'], TDocument>
        : estypes.SearchHitsMetadata<TDocument>;
    };
  };
  top_metrics: {
    top: Array<{
      sort: number[] | string[];
      metrics: Record<
        TAggregationContainer extends Record<string, { metrics: Array<{ field: infer TKeys }> }>
          ? TKeys
          : string,
        string | number | null
      >;
    }>;
  };
  weighted_avg: { value: number | null };
  value_count: {
    value: number;
  };
  // t_test: {} not defined
})[ValidAggregationKeysOf<TAggregationContainer> & AggregationTypeName];

type AggregateOfMap<TAggregationMap extends AggregationMap, TDocument> = {
  [TAggregationName in keyof TAggregationMap]: TAggregationMap[TAggregationName] extends estypes.AggregationsAggregationContainer
    ? AggregateOf<TAggregationMap[TAggregationName], TDocument>
    : never; // using never means we effectively ignore optional keys, using {} creates a union type of { ... } | {}
};

type SubAggregateOf<TAggregationRequest, TDocument = unknown> = TAggregationRequest extends {
  aggs?: AggregationMap;
}
  ? AggregateOfMap<TAggregationRequest['aggs'], TDocument>
  : TAggregationRequest extends { aggregations?: AggregationMap }
  ? AggregateOfMap<TAggregationRequest['aggregations'], TDocument>
  : {};

type SearchResponseOf<
  TAggregationRequest extends TopLevelAggregationRequest,
  TDocument
> = SubAggregateOf<TAggregationRequest, TDocument>;

// if aggregation response cannot be inferred, fall back to unknown
type WrapAggregationResponse<T> = keyof T extends never
  ? { aggregations?: unknown }
  : { aggregations?: T };

export type InferSearchResponseOf<
  TDocument = unknown,
  TSearchRequest extends estypes.SearchRequest = estypes.SearchRequest,
  TOptions extends { restTotalHitsAsInt?: boolean } = {}
> = Omit<estypes.SearchResponse<TDocument>, 'aggregations' | 'hits'> &
  (TSearchRequest['body'] extends TopLevelAggregationRequest
    ? WrapAggregationResponse<SearchResponseOf<TSearchRequest['body'], TDocument>>
    : { aggregations?: InvalidAggregationRequest }) & {
    hits: Omit<estypes.SearchResponse<TDocument>['hits'], 'total' | 'hits'> &
      (TOptions['restTotalHitsAsInt'] extends true
        ? {
            total: number;
          }
        : {
            total: {
              value: number;
              relation: 'eq' | 'gte';
            };
          }) & { hits: HitsOf<TSearchRequest['body'], TDocument> };
  };
