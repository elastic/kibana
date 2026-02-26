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

export interface SearchInput {
  table: string;
  query: string;
  encodedQuery?: string;
  fields?: string;
  limit?: number;
  offset?: number;
}

export interface GetRecordInput {
  table: string;
  sysId: string;
  fields?: string;
}

export interface ListRecordsInput {
  table: string;
  encodedQuery?: string;
  fields?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
}

export interface ListTablesInput {
  query?: string;
  limit?: number;
  offset?: number;
}

export interface ListKnowledgeBasesInput {
  limit?: number;
  offset?: number;
}

export interface GetCommentsInput {
  tableName: string;
  recordSysId: string;
  limit?: number;
  offset?: number;
}

export interface GetAttachmentInput {
  sysId: string;
}
