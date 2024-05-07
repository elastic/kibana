/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  ISearchGeneric,
  ISearchClient,
  SanitizedConnectionRequestParams,
  IEsErrorAttributes,
  ISearchOptions,
  ISearchOptionsSerializable,
} from './src/types';

export type { IKibanaSearchRequest, IKibanaSearchResponse } from './src/kibana_search_types';

export type {
  ISearchRequestParams,
  IEsSearchResponse,
  IEsSearchRequest,
} from './src/es_search_types';
