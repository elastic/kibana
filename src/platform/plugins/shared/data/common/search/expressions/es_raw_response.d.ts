/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ExpressionTypeDefinition } from '@kbn/expressions-plugin/common';
declare const name = 'es_raw_response';
export interface EsRawResponse<T = unknown> {
  type: typeof name;
  body: estypes.SearchResponse<T>;
}
export type EsRawResponseExpressionTypeDefinition = ExpressionTypeDefinition<
  typeof name,
  EsRawResponse,
  EsRawResponse
>;
export declare const esRawResponse: EsRawResponseExpressionTypeDefinition;
export {};
