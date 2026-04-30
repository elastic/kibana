/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { errors as EsErrors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';

const retryResponseStatuses = [
  401, // AuthorizationException
  403, // AuthenticationException
  408, // RequestTimeout
  410, // Gone
  429, // TooManyRequests -> ES circuit breaker
  503, // ServiceUnavailable
  504, // GatewayTimeout
];

const boundedRetryAttempts = 3;
const maxIndefiniteRetryDelayMs = 64_000;

function isRetryableEsClientError(e: Error): boolean {
  if (
    e instanceof EsErrors.NoLivingConnectionsError ||
    e instanceof EsErrors.ConnectionError ||
    e instanceof EsErrors.TimeoutError ||
    (e instanceof EsErrors.ResponseError && retryResponseStatuses.includes(e?.statusCode!))
  ) {
    return true;
  }
  return false;
}

function getExponentialDelayMs(attempt: number, { maxDelayMs }: { maxDelayMs: number }) {
  return Math.min(1000 * Math.pow(2, attempt), maxDelayMs);
}

interface RequestParamsMeta {
  request?: {
    params?: {
      method?: string;
      path?: string;
    };
  };
  meta?: {
    request?: {
      params?: {
        method?: string;
        path?: string;
      };
    };
  };
}

function getRequestDescription(error: EsErrors.ResponseError) {
  const meta = error.meta?.meta as RequestParamsMeta | undefined;
  const params = meta?.request?.params ?? meta?.meta?.request?.params;
  const method = params?.method;
  const path = params?.path?.split('?')[0];

  if (method && path) {
    return `${method} ${path}`;
  }

  return 'Elasticsearch';
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryEsOptions {
  logger?: Logger;
  dataStreamName?: string;
}

export async function retryEs<R>(fn: () => Promise<R>, options: RetryEsOptions = {}) {
  let retryCount = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof Error) || !isRetryableEsClientError(error)) {
        throw error;
      }

      retryCount++;

      if (error instanceof EsErrors.ResponseError && error.statusCode === 429) {
        const retryDelay = getExponentialDelayMs(retryCount - 1, {
          maxDelayMs: maxIndefiniteRetryDelayMs,
        });
        const dataStream = options.dataStreamName
          ? ` for data stream [${options.dataStreamName}]`
          : '';
        const errorType = error.body?.error?.type ?? error.name;

        options.logger?.warn(
          `${getRequestDescription(
            error
          )} call failed with retryable error ${errorType}${dataStream}. This operation will be retried indefinitely because this is a transient ES state. Retrying attempt ${retryCount} in ${
            retryDelay / 1000
          } seconds.`
        );

        await delay(retryDelay);
        continue;
      }

      if (retryCount > boundedRetryAttempts) {
        throw error;
      }

      await delay(getExponentialDelayMs(retryCount - 1, { maxDelayMs: Number.MAX_SAFE_INTEGER }));
    }
  }
}
