/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// =============================================================================
// Action input types (handler parameters)
// =============================================================================

export interface SearchByTitleInput {
  query: string;
  queryObjectType: 'page' | 'data_source';
  startCursor?: string;
  pageSize?: number;
}

export interface GetPageInput {
  pageId: string;
}

export interface GetDataSourceInput {
  dataSourceId: string;
}

export interface QueryDataSourceInput {
  dataSourceId: string;
  filter?: string;
  startCursor?: string;
  pageSize?: number;
}
