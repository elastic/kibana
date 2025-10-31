/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SecurityApiKey,
  SecurityCreateApiKeyRequest,
  SecurityCreateApiKeyResponse,
  SecurityCreateCrossClusterApiKeyRequest,
  SecurityCreateCrossClusterApiKeyResponse,
} from '@elastic/elasticsearch/lib/api/types';

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface ApiStatusResponse {
  status: number;
}

export type ApiKey = SecurityApiKey;
export type CreateApiKeyResponse = SecurityCreateApiKeyResponse;
export type CreateCrossClusterApiKeyResponse = SecurityCreateCrossClusterApiKeyResponse;

/**
 * Union type for all API key creation parameters
 */
export type CreateAPIKeyParams =
  | SecurityCreateApiKeyRequest
  | SecurityCreateCrossClusterApiKeyRequest;

/**
 * Parameters for updating an API key
 */
export interface UpdateAPIKeyParams {
  /** ID of the API key to update */
  id: string;
  /** Updated role descriptors */
  role_descriptors?: Record<string, any>;
  /** Updated metadata */
  metadata?: Record<string, any>;
}

/**
 * Result of updating an API key
 */
export interface UpdateAPIKeyResult {
  /** Whether the API key was updated */
  updated: boolean;
}

/**
 * Parameters for querying API keys
 */
export interface QueryAPIKeyParams {
  /** Query object using Elasticsearch query DSL */
  query?: Record<string, any>;
  /** Starting position for pagination */
  from?: number;
  /** Number of results to return */
  size?: number;
  /** Sort configuration */
  sort?: Array<Record<string, 'asc' | 'desc'>>;
  /** Filters to apply */
  filters?: {
    /** Filter by usernames */
    usernames?: string[];
    /** Filter by API key type */
    type?: 'rest' | 'managed' | 'cross_cluster';
    /** Filter by expiration status */
    expired?: boolean;
  };
  /** Whether to filter API keys the user can access */
  with_limited_by?: boolean;
  /** Whether to include profile uid in results */
  with_profile_uid?: boolean;
  /** Typed keys for aggregations */
  typed_keys?: boolean;
}

/**
 * Result of querying API keys
 */
export interface QueryAPIKeyResult {
  /** Total number of API keys matching the query */
  total: number;
  /** Number of API keys in this response */
  count: number;
  /** Array of API keys */
  apiKeys: SecurityApiKey[];
  /** Aggregations (if requested) */
  aggregations?: Record<string, any>;
}

/**
 * API key to invalidate
 */
export interface ApiKeyToInvalidate {
  /** ID of the API key */
  id: string;
  /** Name of the API key */
  name: string;
}

/**
 * Parameters for invalidating API keys
 */
export interface InvalidateAPIKeyParams {
  /** Array of API keys to invalidate */
  apiKeys: ApiKeyToInvalidate[];
  /** Whether to invalidate as admin (allows invalidating other users' keys) */
  isAdmin?: boolean;
}

/**
 * Result of invalidating API keys
 */
export interface InvalidateAPIKeyResult {
  /** API keys that were successfully invalidated */
  itemsInvalidated: ApiKeyToInvalidate[];
  /** Errors encountered during invalidation */
  errors: Array<{
    id: string;
    name: string;
    error: string;
  }>;
}
