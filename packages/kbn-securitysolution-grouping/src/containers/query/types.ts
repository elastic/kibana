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
  groupByField: string;
  rootAggregations?: NamedAggregation[];
  runtimeMappings?: MappingRuntimeFields;
  additionalAggregationsRoot?: NamedAggregation[];
  pageNumber?: number;
  selectedGroupEsTypes: string[];
  size?: number;
  sort?: Array<{ [category: string]: { order: 'asc' | 'desc' } }>;
  statsAggregations?: NamedAggregation[];
  to: string;
}

export interface MainAggregation extends NamedAggregation {
  groupByFields: {
    aggs: NamedAggregation;
    multi_terms: estypes.AggregationsAggregationContainer['multi_terms'];
  };
}

export interface GroupingQuery extends estypes.QueryDslQueryContainer {
  aggs: MainAggregation;
  query: {
    bool: {
      filter: Array<BoolAgg | RangeAgg>;
    };
  };
  runtime_mappings: MappingRuntimeFields | undefined;
  size: number;
  _source: boolean;
}
