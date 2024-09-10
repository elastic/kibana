/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Script,
  MappingRuntimeField,
  MappingRuntimeFields,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RuntimeFieldSpec, RuntimePrimitiveTypes } from '@kbn/data-views-plugin/common';
import type { BoolQuery } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

type RunTimeMappings =
  | Record<string, Omit<RuntimeFieldSpec, 'type'> & { type: RuntimePrimitiveTypes }>
  | undefined;

export interface BoolAgg {
  bool: BoolQuery;
}

export interface RangeAgg {
  range: { '@timestamp': { gte: string; lte: string } };
}

export type NamedAggregation = Record<string, estypes.AggregationsAggregationContainer>;

export interface GroupingQueryArgs {
  additionalFilters: BoolAgg[];
  from: string;
  groupByField: string;
  rootAggregations?: NamedAggregation[];
  runtimeMappings?: RunTimeMappings;
  additionalAggregationsRoot?: NamedAggregation[];
  pageNumber?: number;
  uniqueValue: string;
  size?: number;
  sort?: Array<{ [category: string]: { order: 'asc' | 'desc' } }>;
  statsAggregations?: NamedAggregation[];
  to: string;
}

export interface MainAggregation extends NamedAggregation {
  groupByFields: {
    aggs: NamedAggregation;
    terms: estypes.AggregationsAggregationContainer['terms'];
  };
}

export interface GroupingRuntimeField extends MappingRuntimeField {
  script: Script & {
    params: Record<string, any>;
  };
}

type GroupingMappingRuntimeFields = Record<'groupByField', GroupingRuntimeField>;

export interface GroupingQuery extends estypes.QueryDslQueryContainer {
  aggs: MainAggregation;
  query: {
    bool: {
      filter: Array<BoolAgg | RangeAgg>;
    };
  };
  runtime_mappings: MappingRuntimeFields & GroupingMappingRuntimeFields;
  size: number;
  _source: boolean;
}
