/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosError, AxiosResponse } from 'axios';
import type { ActionContext } from '../../../connector_spec';
import type {
  GitHubGraphQLPageInfo,
  GitHubGraphQLRateLimit,
  GitHubGraphQLRequestBody,
  GitHubGraphQLResponseBody,
  GitHubGraphQLResult,
} from './types';
import { validateReadOnlyGraphQLQuery } from './validate_read_only_query';

export const GITHUB_GRAPHQL_API_URL = 'https://api.github.com/graphql';

const GITHUB_RETRY_DEFAULT_BASE_DELAY_MS = 1000;
const GITHUB_RETRY_JITTER_MAX_MS = 250;
const GITHUB_RETRY_MAX_DELAY_MS = 60_000;
const GITHUB_RETRY_EXPONENT_CAP = 6;
const GITHUB_MAX_RETRIES = 5;
const GITHUB_BACKOFF_REMAINING_THRESHOLD = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getHeader = (headers: unknown, headerName: string): string | undefined => {
  if (!isRecord(headers)) {
    return undefined;
  }
  const needle = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== needle) {
      continue;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
  }
  return undefined;
};

const getGitHubRetryDelayMs = (params: {
  responseHeaders?: unknown;
  attempt: number;
}): number => {
  const { responseHeaders, attempt } = params;
  const retryAfter = getHeader(responseHeaders, 'retry-after');
  const retryAfterSeconds = typeof retryAfter === 'string' ? Number(retryAfter) : NaN;

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    const jitterMs = Math.floor(Math.random() * GITHUB_RETRY_JITTER_MAX_MS);
    return Math.min(GITHUB_RETRY_MAX_DELAY_MS, Math.floor(retryAfterSeconds * 1000) + jitterMs);
  }

  const resetHeader = getHeader(responseHeaders, 'x-ratelimit-reset');
  const resetSeconds = typeof resetHeader === 'string' ? Number(resetHeader) : NaN;
  if (Number.isFinite(resetSeconds) && resetSeconds > 0) {
    const waitMs = Math.max(0, resetSeconds * 1000 - Date.now());
    if (waitMs > 0) {
      const jitterMs = Math.floor(Math.random() * GITHUB_RETRY_JITTER_MAX_MS);
      return Math.min(GITHUB_RETRY_MAX_DELAY_MS, waitMs + jitterMs);
    }
  }

  const exp = Math.min(GITHUB_RETRY_EXPONENT_CAP, Math.max(0, attempt));
  const base = GITHUB_RETRY_DEFAULT_BASE_DELAY_MS * 2 ** exp;
  const jitterMs = Math.floor(Math.random() * GITHUB_RETRY_JITTER_MAX_MS);
  return Math.min(GITHUB_RETRY_MAX_DELAY_MS, base + jitterMs);
};

const isRateLimitedResponse = (status?: number, message?: string): boolean => {
  if (status === 403 || status === 429) {
    return true;
  }
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return lower.includes('rate limit') || lower.includes('secondary rate limit');
};

const getValueAtPath = (value: unknown, path?: string): unknown => {
  if (!path) {
    return undefined;
  }
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }
    return current[segment];
  }, value);
};

export const extractPageInfo = (
  data: unknown,
  pageInfoPath?: string
): GitHubGraphQLPageInfo | undefined => {
  const pageInfoContainer = getValueAtPath(data, pageInfoPath);
  if (!isRecord(pageInfoContainer) || !isRecord(pageInfoContainer.pageInfo)) {
    return undefined;
  }

  const { hasNextPage, endCursor } = pageInfoContainer.pageInfo;
  if (typeof hasNextPage !== 'boolean') {
    return undefined;
  }

  return {
    hasNextPage,
    endCursor: typeof endCursor === 'string' ? endCursor : null,
  };
};

export const resolveGraphQLApiUrl = (config?: Record<string, unknown>): string => {
  const configured = config?.graphqlApiUrl;
  return typeof configured === 'string' && configured.length > 0
    ? configured
    : GITHUB_GRAPHQL_API_URL;
};

export const shouldBackoffForRateLimit = (rateLimit?: GitHubGraphQLRateLimit): boolean =>
  rateLimit !== undefined && rateLimit.remaining <= GITHUB_BACKOFF_REMAINING_THRESHOLD;

export const executeGitHubGraphQL = async <TData = unknown>(params: {
  ctx: ActionContext;
  body: GitHubGraphQLRequestBody;
  pageInfoPath?: string;
  templateId?: string;
  maxRetries?: number;
}): Promise<GitHubGraphQLResult<TData>> => {
  const { ctx, body, pageInfoPath, templateId, maxRetries = GITHUB_MAX_RETRIES } = params;

  validateReadOnlyGraphQLQuery(body.query);

  const url = resolveGraphQLApiUrl(ctx.config);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response: AxiosResponse<GitHubGraphQLResponseBody<TData>> = await ctx.client.post(
        url,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
          },
        }
      );

      const { data: responseBody } = response;
      if (responseBody.errors?.length) {
        const message = responseBody.errors.map((error) => error.message).join('; ');
        if (isRateLimitedResponse(undefined, message) && attempt < maxRetries) {
          const delayMs = getGitHubRetryDelayMs({ responseHeaders: response.headers, attempt });
          ctx.log.debug(
            `GitHub GraphQL rate limited via errors (attempt ${attempt + 1}/${
              maxRetries + 1
            }). Sleeping ${delayMs}ms.`
          );
          await sleep(delayMs);
          continue;
        }
        throw new Error(`GitHub GraphQL request failed: ${message}`);
      }

      const rateLimit = responseBody.extensions?.rateLimit;
      const data = responseBody.data as TData;

      return {
        data,
        pageInfo: extractPageInfo(data, pageInfoPath),
        rateLimit,
        shouldBackoff: shouldBackoffForRateLimit(rateLimit),
        templateId,
      };
    } catch (error) {
      const err = error as AxiosError<GitHubGraphQLResponseBody<TData>>;
      const status = err.response?.status;
      const message = err.message;

      if (isRateLimitedResponse(status, message) && attempt < maxRetries) {
        const delayMs = getGitHubRetryDelayMs({ responseHeaders: err.response?.headers, attempt });
        ctx.log.debug(
          `GitHub GraphQL rate limited (attempt ${attempt + 1}/${
            maxRetries + 1
          }). Sleeping ${delayMs}ms.`
        );
        await sleep(delayMs);
        continue;
      }

      throw error;
    }
  }

  throw new Error(`GitHub GraphQL request failed after ${maxRetries + 1} attempts`);
};
