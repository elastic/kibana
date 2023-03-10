/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { BoolQuery } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

interface BoolAgg {
  bool: BoolQuery;
}

interface RangeAgg {
  range: { '@timestamp': { gte: string; lte: string } };
}

export type NamedAggregation = Record<string, estypes.AggregationsAggregationContainer>;

export interface GroupingQueryArgs {
  additionalFilters: BoolAgg[];
  from: string;
  runtimeMappings?: MappingRuntimeFields;
  rootAggregations?: NamedAggregation[];
  groupByFields: string[];
  size?: number;
  pageNumber?: number;
  sort?: Array<{ [category: string]: { order: 'asc' | 'desc' } }>;
  metricsAggregations?: NamedAggregation[];
  to: string;
}

export interface MainAggregation extends NamedAggregation {
  groupByFields: {
    terms?: estypes.AggregationsAggregationContainer['terms'];
    multi_terms?: estypes.AggregationsAggregationContainer['multi_terms'];
    aggs: NamedAggregation;
  };
}

export interface GroupingQuery extends estypes.QueryDslQueryContainer {
  size: number;
  runtime_mappings: MappingRuntimeFields | undefined;
  query: {
    bool: {
      filter: Array<BoolAgg | RangeAgg>;
    };
  };
  _source: boolean;
  aggs: MainAggregation;
}
