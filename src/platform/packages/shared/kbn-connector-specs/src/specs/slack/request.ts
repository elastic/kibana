/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosError, AxiosResponse } from 'axios';
import type { ActionContext } from '../../connector_spec';
import type { SlackErrorFields } from './types';

export const SLACK_API_BASE = 'https://slack.com/api';
export const SLACK_MAX_RETRIES = 5;

const SLACK_RETRY_DEFAULT_BASE_DELAY_MS = 1000;
const SLACK_RETRY_JITTER_MAX_MS = 250;
const SLACK_RETRY_MAX_DELAY_MS = 60_000;
const SLACK_RETRY_EXPONENT_CAP = 6;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getHeader = (headers: unknown, headerName: string): string | undefined => {
  if (!isRecord(headers)) return undefined;
  const needle = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== needle) continue;
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  }
  return undefined;
};

const getSlackErrorFields = (responseData: unknown): SlackErrorFields => {
  if (!isRecord(responseData)) return {};
  return {
    error: asString(responseData.error),
    needed: asString(responseData.needed),
    provided: asString(responseData.provided),
  };
};

export const formatSlackApiErrorMessage = ({
  action,
  responseData,
}: {
  action: string;
  responseData?: unknown;
  responseHeaders?: unknown;
}): string => {
  const { error: slackError, needed, provided } = getSlackErrorFields(responseData);
  const error = slackError ?? 'unknown_error';
  const extras: string[] = [];

  if (needed) extras.push(`needed=${needed}`);
  if (provided) extras.push(`provided=${provided}`);

  return extras.length > 0
    ? `Slack ${action} error: ${error} (${extras.join(', ')})`
    : `Slack ${action} error: ${error}`;
};

const getSlackRetryDelayMs = ({
  responseHeaders,
  attempt,
  defaultBaseDelayMs = SLACK_RETRY_DEFAULT_BASE_DELAY_MS,
}: {
  responseHeaders?: unknown;
  attempt: number;
  defaultBaseDelayMs?: number;
}): number => {
  const retryAfter = getHeader(responseHeaders, 'retry-after');
  const retryAfterSeconds = typeof retryAfter === 'string' ? Number(retryAfter) : NaN;

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    const jitterMs = Math.floor(Math.random() * SLACK_RETRY_JITTER_MAX_MS);
    return Math.min(SLACK_RETRY_MAX_DELAY_MS, Math.floor(retryAfterSeconds * 1000) + jitterMs);
  }

  const exponent = Math.min(SLACK_RETRY_EXPONENT_CAP, Math.max(0, attempt));
  const base = defaultBaseDelayMs * Math.pow(2, exponent);
  const jitterMs = Math.floor(Math.random() * SLACK_RETRY_JITTER_MAX_MS);
  return Math.min(SLACK_RETRY_MAX_DELAY_MS, base + jitterMs);
};

export const slackRequestWithRateLimitRetry = async <TData>({
  ctx,
  action,
  request,
  maxRetries = 3,
}: {
  ctx: ActionContext;
  action: string;
  request: () => Promise<AxiosResponse<TData>>;
  maxRetries?: number;
}): Promise<AxiosResponse<TData>> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request();
    } catch (error) {
      const axiosError = error as AxiosError<unknown>;
      const status = axiosError.response?.status;
      const slackError = getSlackErrorFields(axiosError.response?.data).error;
      const isRateLimited =
        status === 429 ||
        slackError === 'ratelimited' ||
        (typeof axiosError.message === 'string' && axiosError.message.includes('ratelimited'));

      if (!isRateLimited || attempt === maxRetries) {
        throw error;
      }

      const delayMs = getSlackRetryDelayMs({
        responseHeaders: axiosError.response?.headers,
        attempt,
      });
      ctx.log.debug(
        `Slack ${action} rate limited (attempt ${
          attempt + 1
        }/${maxRetries}). Sleeping ${delayMs}ms before retry.`
      );
      await sleep(delayMs);
    }
  }

  throw new Error(`Slack ${action} failed after ${maxRetries + 1} attempts`);
};
