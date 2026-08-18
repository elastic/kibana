/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface GitHubGraphQLPageInfo {
  hasNextPage: boolean;
  endCursor?: string | null;
}

export interface GitHubGraphQLRateLimit {
  limit: number;
  remaining: number;
  resetAt: string;
  used?: number;
}

export interface GitHubGraphQLResult<TData = unknown> {
  data: TData;
  pageInfo?: GitHubGraphQLPageInfo;
  rateLimit?: GitHubGraphQLRateLimit;
  /** True when remaining rate-limit budget is low and workflows should wait before the next call. */
  shouldBackoff: boolean;
  templateId?: string;
}

export interface GitHubGraphQLRequestBody {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export interface GitHubGraphQLResponseBody<TData = unknown> {
  data?: TData;
  errors?: Array<{ message: string }>;
  extensions?: {
    rateLimit?: GitHubGraphQLRateLimit;
  };
}

export interface GitHubQueryTemplate {
  id: string;
  description: string;
  query: string;
  /** Dot-separated path to a PageInfo object inside `data`, e.g. "organization.repositories". */
  pageInfoPath?: string;
}
