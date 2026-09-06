/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<< HEAD
=======
import { isError } from 'lodash';
>>>>>>> 35f8e215b5a1 ([Connectors] Add GitHub GraphQL Ingest Plane (CONN-001, Phase 1))
import type { AxiosError, AxiosResponse } from 'axios';
import type { ActionContext } from '../../../connector_spec';
import type {
  GitHubGraphQLPageInfo,
  GitHubGraphQLRateLimit,
  GitHubGraphQLRequestBody,
  GitHubGraphQLResponseBody,
  GitHubGraphQLResult,
<<<<<<< HEAD
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
=======
  GitHubQueryTemplate,
} from './types';

export const GITHUB_GRAPHQL_API_URL = 'https://api.github.com/graphql';

const GITHUB_MAX_RETRIES = 2;
const GITHUB_RETRY_CAP_MS = 5_000;
const GITHUB_RETRY_JITTER_MAX_MS = 250;
const GITHUB_RETRY_BASE_DELAY_MS = 1_000;
const GITHUB_BACKOFF_REMAINING_THRESHOLD = 100;

// ─── Typed errors ─────────────────────────────────────────────────────────────

/** Thrown when GitHub GraphQL rate-limit retries are exhausted or the reset time exceeds the retry cap. */
export class GitHubRateLimitError extends Error {
  public readonly resetAt: string | undefined;

  constructor({ resetAt, message }: { resetAt?: string; message: string }) {
    super(message);
    this.name = 'GitHubRateLimitError';
    this.resetAt = resetAt;
  }
}

export const isGitHubRateLimitError = (error: unknown): error is GitHubRateLimitError =>
  error instanceof GitHubRateLimitError ||
  (isError(error) && error.name === 'GitHubRateLimitError');

// ─── Utilities ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
>>>>>>> 35f8e215b5a1 ([Connectors] Add GitHub GraphQL Ingest Plane (CONN-001, Phase 1))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getHeader = (headers: unknown, headerName: string): string | undefined => {
<<<<<<< HEAD
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
=======
  if (!isRecord(headers)) return undefined;
  const needle = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== needle) continue;
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
>>>>>>> 35f8e215b5a1 ([Connectors] Add GitHub GraphQL Ingest Plane (CONN-001, Phase 1))
  }
  return undefined;
};

<<<<<<< HEAD
const getGitHubRetryDelayMs = (params: { responseHeaders?: unknown; attempt: number }): number => {
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

=======
>>>>>>> 35f8e215b5a1 ([Connectors] Add GitHub GraphQL Ingest Plane (CONN-001, Phase 1))
export const resolveGraphQLApiUrl = (config?: Record<string, unknown>): string => {
  const configured = config?.graphqlApiUrl;
  return typeof configured === 'string' && configured.length > 0
    ? configured
    : GITHUB_GRAPHQL_API_URL;
};

export const shouldBackoffForRateLimit = (rateLimit?: GitHubGraphQLRateLimit): boolean =>
  rateLimit !== undefined && rateLimit.remaining <= GITHUB_BACKOFF_REMAINING_THRESHOLD;

<<<<<<< HEAD
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
=======
// ─── Header-based delay helpers ───────────────────────────────────────────────

const parseRetryAfterMs = (headers: unknown): number | undefined => {
  const retryAfter = getHeader(headers, 'retry-after');
  const seconds = retryAfter !== undefined ? Number(retryAfter) : NaN;
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.floor(seconds * 1000);
  }
  return undefined;
};

const parseResetAtFromHeaders = (headers: unknown): string | undefined => {
  const resetHeader = getHeader(headers, 'x-ratelimit-reset');
  const resetSeconds = resetHeader !== undefined ? Number(resetHeader) : NaN;
  if (Number.isFinite(resetSeconds) && resetSeconds > 0) {
    return new Date(resetSeconds * 1000).toISOString();
  }
  return undefined;
};

const computeRetryDelayMs = (params: { headers: unknown; attempt: number }): number => {
  const { headers, attempt } = params;
  const retryAfterMs = parseRetryAfterMs(headers);
  if (retryAfterMs !== undefined && retryAfterMs <= GITHUB_RETRY_CAP_MS) {
    const jitter = Math.floor(Math.random() * GITHUB_RETRY_JITTER_MAX_MS);
    return Math.min(GITHUB_RETRY_CAP_MS, retryAfterMs + jitter);
  }
  const exp = Math.min(attempt, 3);
  const base = GITHUB_RETRY_BASE_DELAY_MS * 2 ** exp;
  const jitter = Math.floor(Math.random() * GITHUB_RETRY_JITTER_MAX_MS);
  return Math.min(GITHUB_RETRY_CAP_MS, base + jitter);
};

// ─── Rate-limit detection ─────────────────────────────────────────────────────

const hasRateLimitHeaders = (headers: unknown): boolean => {
  const remaining = getHeader(headers, 'x-ratelimit-remaining');
  if (remaining === '0') return true;
  const retryAfter = getHeader(headers, 'retry-after');
  return retryAfter !== undefined;
};

const hasRateLimitMessage = (message: string): boolean => {
  const lower = message.toLowerCase();
  return lower.includes('rate limit') || lower.includes('secondary rate limit');
};

const isRateLimited = (status: number | undefined, headers: unknown, message?: string): boolean => {
  if (status === 429) return true;
  if (status === 403) {
    return hasRateLimitHeaders(headers) || (message !== undefined && hasRateLimitMessage(message));
  }
  return false;
};

// ─── Output unwrapping ────────────────────────────────────────────────────────

const getValueAtPath = (value: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, value);

export const unwrapTemplateResult = (
  rawData: Record<string, unknown>,
  template: GitHubQueryTemplate
): Pick<GitHubGraphQLResult, 'data' | 'meta' | 'pageInfo'> => {
  const target = getValueAtPath(rawData, template.resultPath);

  if (template.isPaginated) {
    if (!isRecord(target)) {
      return {
        data: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      };
    }

    const { nodes, pageInfo, ...siblings } = target;
    const data = Array.isArray(nodes) ? nodes : [];
    const pi = isRecord(pageInfo) ? pageInfo : {};
    const hasNextPage = typeof pi.hasNextPage === 'boolean' ? pi.hasNextPage : false;
    const endCursor = typeof pi.endCursor === 'string' ? pi.endCursor : null;

    const meta =
      Object.keys(siblings).length > 0 ? (siblings as Record<string, unknown>) : undefined;

    return {
      data,
      meta,
      pageInfo: { hasNextPage, endCursor },
    };
  }

  // Single-entity template
  const entity = target !== undefined && target !== null ? target : null;
  if (entity === null) {
    return {
      data: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    };
  }
  return {
    data: [entity],
    pageInfo: { hasNextPage: false, endCursor: null },
  };
};

// ─── rateLimit extraction & data stripping ────────────────────────────────────

const extractAndStripRateLimit = (
  data: Record<string, unknown>,
  extensionsRateLimit?: GitHubGraphQLRateLimit
): { rateLimit: GitHubGraphQLRateLimit | undefined; strippedData: Record<string, unknown> } => {
  const { rateLimit: dataRateLimit, ...rest } = data;

  let rateLimit: GitHubGraphQLRateLimit | undefined;
  if (isRecord(dataRateLimit)) {
    const { cost, remaining, limit, resetAt } = dataRateLimit;
    if (
      typeof cost === 'number' &&
      typeof remaining === 'number' &&
      typeof limit === 'number' &&
      typeof resetAt === 'string'
    ) {
      rateLimit = { cost, remaining, limit, resetAt };
    }
  }
  if (rateLimit === undefined && extensionsRateLimit !== undefined) {
    rateLimit = extensionsRateLimit;
  }

  return { rateLimit, strippedData: rest };
};

// ─── 403 error message ────────────────────────────────────────────────────────

const buildScopeErrorMessage = (status: number): string => {
  const prefix = `GitHub API returned ${status}.`;
  return (
    `${prefix} The token may be missing required scopes. ` +
    'For GraphQL ingest actions, ensure the token has: repo, read:org, read:project.'
  );
};

// ─── Main execute function ────────────────────────────────────────────────────

export const executeRunQueryTemplate = async (params: {
  ctx: ActionContext;
  template: GitHubQueryTemplate;
  variables: Record<string, unknown>;
}): Promise<GitHubGraphQLResult> => {
  const { ctx, template, variables } = params;
  const url = resolveGraphQLApiUrl(ctx.config);

  const body: GitHubGraphQLRequestBody = {
    query: template.document,
    variables,
  };

  let lastResetAt: string | undefined;

  for (let attempt = 0; attempt <= GITHUB_MAX_RETRIES; attempt++) {
    try {
      const response: AxiosResponse<GitHubGraphQLResponseBody<Record<string, unknown>>> =
        await ctx.client.post(url, body, {
>>>>>>> 35f8e215b5a1 ([Connectors] Add GitHub GraphQL Ingest Plane (CONN-001, Phase 1))
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
          },
<<<<<<< HEAD
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
=======
        });

      const { data: responseBody } = response;

      // Partial response: errors alongside data — fail closed
      if (responseBody.errors?.length) {
        const rateLimitError = responseBody.errors.find((e) => hasRateLimitMessage(e.message));
        if (rateLimitError !== undefined && attempt < GITHUB_MAX_RETRIES) {
          const delayMs = computeRetryDelayMs({ headers: response.headers, attempt });
          ctx.log.debug(
            `GitHub GraphQL rate limited via errors (attempt ${attempt + 1}/${GITHUB_MAX_RETRIES + 1}). Retrying in ${delayMs}ms.`
>>>>>>> 35f8e215b5a1 ([Connectors] Add GitHub GraphQL Ingest Plane (CONN-001, Phase 1))
          );
          await sleep(delayMs);
          continue;
        }
<<<<<<< HEAD
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
=======
        if (rateLimitError !== undefined) {
          throw new GitHubRateLimitError({
            resetAt: lastResetAt ?? parseResetAtFromHeaders(response.headers),
            message: `GitHub GraphQL rate limit exceeded: ${rateLimitError.message}`,
          });
        }

        const errorDetails = responseBody.errors
          .map((e) => (e.path ? `${e.message} (path: ${e.path.join('.')})` : e.message))
          .join('; ');
        throw new Error(`GitHub GraphQL request failed: ${errorDetails}`);
      }

      if (!isRecord(responseBody.data)) {
        throw new Error('GitHub GraphQL response contained no data');
      }

      const { rateLimit, strippedData } = extractAndStripRateLimit(
        responseBody.data,
        responseBody.extensions?.rateLimit
      );

      const { data, meta, pageInfo } = unwrapTemplateResult(strippedData, template);

      const resolvedRateLimit: GitHubGraphQLRateLimit = rateLimit ?? {
        cost: 0,
        limit: 5000,
        remaining: 5000,
        resetAt: '',
      };

      return {
        data,
        meta,
        pageInfo,
        rateLimit: resolvedRateLimit,
        shouldBackoff: shouldBackoffForRateLimit(resolvedRateLimit),
        templateId: template.id,
      };
    } catch (error) {
      if (isGitHubRateLimitError(error)) throw error;

      const axiosError = error as AxiosError<GitHubGraphQLResponseBody>;
      const status = axiosError.response?.status;
      const headers = axiosError.response?.headers;
      const message = axiosError.message ?? '';

      if (isRateLimited(status, headers, message)) {
        lastResetAt = parseResetAtFromHeaders(headers);

        const retryAfterMs = parseRetryAfterMs(headers);
        if (retryAfterMs !== undefined && retryAfterMs > GITHUB_RETRY_CAP_MS) {
          throw new GitHubRateLimitError({
            resetAt: lastResetAt,
            message: `GitHub rate limit exceeded; reset in ${Math.ceil(retryAfterMs / 1000)}s (exceeds retry cap).`,
          });
        }

        if (attempt < GITHUB_MAX_RETRIES) {
          const delayMs = computeRetryDelayMs({ headers, attempt });
          ctx.log.debug(
            `GitHub GraphQL rate limited (attempt ${attempt + 1}/${GITHUB_MAX_RETRIES + 1}). Retrying in ${delayMs}ms.`
          );
          await sleep(delayMs);
          continue;
        }

        throw new GitHubRateLimitError({
          resetAt: lastResetAt,
          message: `GitHub rate limit exceeded after ${GITHUB_MAX_RETRIES + 1} attempts.`,
        });
      }

      if (status === 401 || (status === 403 && !isRateLimited(status, headers, message))) {
        throw new Error(buildScopeErrorMessage(status));
>>>>>>> 35f8e215b5a1 ([Connectors] Add GitHub GraphQL Ingest Plane (CONN-001, Phase 1))
      }

      throw error;
    }
  }

<<<<<<< HEAD
  throw new Error(`GitHub GraphQL request failed after ${maxRetries + 1} attempts`);
};
=======
  throw new GitHubRateLimitError({
    resetAt: lastResetAt,
    message: `GitHub rate limit exceeded after ${GITHUB_MAX_RETRIES + 1} attempts.`,
  });
};

export const executeGraphQLViewer = async (params: {
  ctx: ActionContext;
}): Promise<{ login: string }> => {
  const { ctx } = params;
  const url = resolveGraphQLApiUrl(ctx.config);
  const body: GitHubGraphQLRequestBody = {
    query: 'query GitHubConnectorTest { viewer { login } }',
  };

  const response: AxiosResponse<GitHubGraphQLResponseBody<{ viewer?: { login?: string } }>> =
    await ctx.client.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
    });

  const login = response.data?.data?.viewer?.login ?? 'unknown';
  return { login };
};

>>>>>>> 35f8e215b5a1 ([Connectors] Add GitHub GraphQL Ingest Plane (CONN-001, Phase 1))
