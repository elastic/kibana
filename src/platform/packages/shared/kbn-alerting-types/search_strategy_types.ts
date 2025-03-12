/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/search-types';
import type {
  MappingRuntimeFields,
  QueryDslFieldAndFormat,
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';
import type { Alert } from './alerts_types';

export type RuleRegistrySearchRequest = IEsSearchRequest & {
  ruleTypeIds: string[];
  consumers?: string[];
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
