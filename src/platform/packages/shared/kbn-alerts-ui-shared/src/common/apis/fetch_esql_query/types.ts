/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLSearchResponse } from '@kbn/es-types';

export interface FetchEsqlQueryParams {
  // Dependencies
  data: DataPublicPluginStart;

  // Params
  /**
   * ES|QL query string
   */
  query: string;

  /**
   * Filter for the ES|QL query
   */
  filter?: unknown;
}

export type EsqlQueryResponse = ESQLSearchResponse;
