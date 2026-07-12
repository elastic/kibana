/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodSchema } from '@kbn/zod/v4';

export interface GitHubGraphQLPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface GitHubGraphQLRateLimit {
  cost: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

/** The stable output contract for every runQueryTemplate call. */
export interface GitHubGraphQLResult {
  data: unknown[];
  meta?: Record<string, unknown>;
  pageInfo: GitHubGraphQLPageInfo;
  rateLimit: GitHubGraphQLRateLimit;
  shouldBackoff: boolean;
  templateId: string;
}

export interface GitHubGraphQLRequestBody {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export interface GitHubGraphQLResponseBody<TData = unknown> {
  data?: TData;
  errors?: Array<{ message: string; path?: string[] }>;
  extensions?: {
    rateLimit?: GitHubGraphQLRateLimit;
  };
}

export interface GitHubQueryTemplate {
  id: string;
  description: string;
  /** Full GraphQL document with rateLimit selection included. */
  document: string;
  /** Zod schema for template-specific variables (excludes first/after). */
  variablesSchema: ZodSchema<Record<string, unknown>>;
  /** Dot-separated path to the result inside `data` (e.g. "organization.repositories"). */
  resultPath: string;
  /** True for paginated templates (nodes+pageInfo); false for single-entity templates. */
  isPaginated: boolean;
}
