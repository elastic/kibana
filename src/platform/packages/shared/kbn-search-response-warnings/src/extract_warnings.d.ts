/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Start as InspectorStartContract, RequestAdapter } from '@kbn/inspector-plugin/public';
import type { SearchResponseWarning } from './types';
/**
 * @internal
 */
export declare function extractWarnings(
  rawResponse: estypes.SearchResponse | ESQLSearchResponse,
  inspectorService: InspectorStartContract,
  requestAdapter: RequestAdapter,
  requestName: string,
  requestId?: string
): SearchResponseWarning[];
