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

import { SearchResponse, SearchParams } from 'elasticsearch';

export interface StringMap<T = unknown> {
  [key: string]: T;
}

export type IndexAsString<Map> = {
  [k: string]: Map[keyof Map];
} & Map;

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface BoolQuery {
  must_not: Array<Record<string, any>>;
  should: Array<Record<string, any>>;
  filter: Array<Record<string, any>>;
}

// extending SearchResponse to be able to have typed aggregations

type AggregationType =
  | 'date_histogram'
  | 'histogram'
  | 'terms'
  | 'avg'
  | 'top_hits'
  | 'max'
  | 'min'
  | 'percentiles'
  | 'sum'
  | 'extended_stats'
  | 'filter'
  | 'filters'
  | 'cardinality'
  | 'sampler'
  | 'value_count';

type AggOptions = AggregationOptionMap & {
  [key: string]: any;
};

// eslint-disable-next-line @typescript-eslint/prefer-interface
export type AggregationOptionMap = {
  aggs?: {
    [aggregationName: string]: {
      [T in AggregationType]?: AggOptions & AggregationOptionMap;
    };
  };
};

type SubAggregation<T> = T extends { aggs: any } ? AggregationResultMap<T['aggs']> : {};

// eslint-disable-next-line @typescript-eslint/prefer-interface
type BucketAggregation<SubAggregationMap, KeyType = string> = {
  buckets: Array<
    {
      key: KeyType;
      key_as_string: string;
      doc_count: number;
    } & (SubAggregation<SubAggregationMap>)
  >;
};

type FilterAggregation<SubAggregationMap> = {
  doc_count: number;
} & SubAggregation<SubAggregationMap>;

// eslint-disable-next-line @typescript-eslint/prefer-interface
type FiltersAggregation<SubAggregationMap> = {
  buckets: Array<
    {
      doc_count: number;
    } & SubAggregation<SubAggregationMap>
  >;
};

type SamplerAggregation<SubAggregationMap> = SubAggregation<SubAggregationMap> & {
  doc_count: number;
};

interface AggregatedValue {
  value: number | null;
}

type AggregationResultMap<AggregationOption> = IndexAsString<
  {
    [AggregationName in keyof AggregationOption]: {
      avg: AggregatedValue;
      max: AggregatedValue;
      min: AggregatedValue;
      sum: AggregatedValue;
      value_count: AggregatedValue;
      // Elasticsearch might return terms with numbers, but this is a more limited type
      terms: BucketAggregation<AggregationOption[AggregationName], string>;
      date_histogram: BucketAggregation<AggregationOption[AggregationName], number>;
      histogram: BucketAggregation<AggregationOption[AggregationName], number>;
      top_hits: {
        hits: {
          total: number;
          max_score: number | null;
          hits: Array<{
            _source: AggregationOption[AggregationName] extends {
              Mapping: any;
            }
              ? AggregationOption[AggregationName]['Mapping']
              : never;
          }>;
        };
      };
      percentiles: {
        values: {
          [key: string]: number;
        };
      };
      extended_stats: {
        count: number;
        min: number | null;
        max: number | null;
        avg: number | null;
        sum: number;
        sum_of_squares: number | null;
        variance: number | null;
        std_deviation: number | null;
        std_deviation_bounds: {
          upper: number | null;
          lower: number | null;
        };
      };
      filter: FilterAggregation<AggregationOption[AggregationName]>;
      filters: FiltersAggregation<AggregationOption[AggregationName]>;
      cardinality: {
        value: number;
      };
      sampler: SamplerAggregation<AggregationOption[AggregationName]>;
    }[AggregationType & keyof AggregationOption[AggregationName]];
  }
>;

export type IEsRawSearchResponse<THitType, TSearchParams extends SearchParams> = Pick<
  SearchResponse<THitType>,
  Exclude<keyof SearchResponse<THitType>, 'aggregations'>
> &
  (TSearchParams extends { body: Required<AggregationOptionMap> }
    ? {
        aggregations?: AggregationResultMap<TSearchParams['body']['aggs']>;
      }
    : {});

export interface ESFilter {
  [key: string]: {
    [key: string]: string | string[] | number | StringMap | ESFilter[];
  };
}
