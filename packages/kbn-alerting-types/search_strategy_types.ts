/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/search-types';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type {
  MappingRuntimeFields,
  QueryDslFieldAndFormat,
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Alert } from './alert_type';

export type RuleRegistrySearchRequest = IEsSearchRequest & {
  featureIds: ValidFeatureId[];
  fields?: QueryDslFieldAndFormat[];
  query?: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  sort?: SortCombinations[];
  pagination?: RuleRegistrySearchRequestPagination;
  runtimeMappings?: MappingRuntimeFields;
};

export interface RuleRegistrySearchRequestPagination {
  pageIndex: number;
  pageSize: number;
}

export interface RuleRegistryInspect {
  dsl: string[];
}

export interface RuleRegistrySearchResponse extends IEsSearchResponse<Alert> {
  inspect?: RuleRegistryInspect;
}
