/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IEsErrorAttributes } from '@kbn/search-types';
import { isEsqlResponseError } from './esql_response_error';

/**
 * Values of the `error_category` label emitted alongside chart-section error
 * reports. `user_input` marks failures caused by what the user typed (e.g. an
 * invalid ES|QL or KQL expression) so incident detection can exclude them from
 * the failure rate without dropping the events themselves.
 */
export const ERROR_CATEGORY = {
  USER_INPUT: 'user_input',
  APPLICATION: 'application',
  UNKNOWN: 'unknown',
} as const;

export type ChartSectionErrorCategory = (typeof ERROR_CATEGORY)[keyof typeof ERROR_CATEGORY];

/** Elasticsearch error metadata recovered from a rejected chart-section fetch. */
export interface ChartSectionErrorMeta {
  type?: string;
  status?: number;
}

/**
 * Elasticsearch error types that only occur when Elasticsearch rejects the
 * query text itself. Only consulted when no status could be recovered, which
 * is the common case for search-interceptor errors. Matched anywhere in the
 * cause chain, since Elasticsearch often nests the real reason under a generic
 * wrapper (e.g. an `illegal_argument_exception` caused by a remote
 * `verification_exception`).
 */
const USER_INPUT_ERROR_TYPES: readonly string[] = ['parsing_exception', 'verification_exception'];

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;

/**
 * HTTP statuses that Elasticsearch only returns for something the user
 * typed: a query it cannot parse or resolve (400) or an index pattern that
 * matches nothing (404). Every other status, including the rest of the 4xx
 * range (e.g. 401, 403, 429), is outside the user's control and therefore
 * counted as an application failure.
 */
const USER_INPUT_STATUSES: readonly number[] = [HTTP_BAD_REQUEST, HTTP_NOT_FOUND];

const toRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const toFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * Reads the `attributes` bag that the search interceptor puts on `EsError`
 * (and its `PainlessError` / `TsdbError` subclasses). Duck-typed rather than
 * an `instanceof` check to keep this module free of the React/EUI imports in
 * `@kbn/search-errors`.
 */
const getSearchErrorAttributes = (error: unknown): IEsErrorAttributes | undefined =>
  toRecord(toRecord(error)?.attributes) as IEsErrorAttributes | undefined;

/**
 * Returns the Elasticsearch error cause for either error shape that can reach
 * a chart-section reporter: an `EsqlResponseError` built from a 200 response
 * carrying an embedded error, or an `EsError` raised by the search interceptor
 * when the request itself failed.
 */
const getErrorCause = (error: unknown): unknown => {
  if (isEsqlResponseError(error)) {
    return { type: error.type, root_cause: error.rootCause };
  }

  return getSearchErrorAttributes(error)?.error;
};

const collectCauseTypes = (cause: unknown, types: string[] = []): string[] => {
  const record = toRecord(cause);
  if (!record) {
    return types;
  }

  if (typeof record.type === 'string') {
    types.push(record.type);
  }
  collectCauseTypes(record.caused_by, types);
  if (Array.isArray(record.root_cause)) {
    for (const rootCause of record.root_cause) {
      collectCauseTypes(rootCause, types);
    }
  }

  return types;
};

/**
 * Extracts the Elasticsearch error type and HTTP status behind a failed
 * chart-section fetch, for use as the `esql_error_type` / `esql_status` APM
 * labels and as the classification input.
 */
export const getChartSectionErrorMeta = (error: unknown): ChartSectionErrorMeta => {
  if (isEsqlResponseError(error)) {
    return { type: error.type, status: error.status };
  }

  const attributes = getSearchErrorAttributes(error);
  if (!attributes) {
    return {};
  }

  const { error: cause, rawResponse } = attributes;

  return {
    type: cause?.type,
    // `EsError` does not copy the HTTP `statusCode` off the rejected request,
    // so the Elasticsearch body kept in `rawResponse` is normally the only
    // place a status survives the search interceptor.
    status:
      toFiniteNumber(toRecord(rawResponse)?.status) ?? toFiniteNumber(toRecord(error)?.statusCode),
  };
};

/**
 * Classifies a chart-section error so telemetry can separate user-authored
 * query mistakes from genuine application failures.
 */
export const classifyChartSectionError = (error: unknown): ChartSectionErrorCategory => {
  const { status } = getChartSectionErrorMeta(error);

  if (status !== undefined) {
    return USER_INPUT_STATUSES.includes(status)
      ? ERROR_CATEGORY.USER_INPUT
      : ERROR_CATEGORY.APPLICATION;
  }

  const causeTypes = collectCauseTypes(getErrorCause(error));
  if (causeTypes.some((type) => USER_INPUT_ERROR_TYPES.includes(type))) {
    return ERROR_CATEGORY.USER_INPUT;
  }

  return ERROR_CATEGORY.UNKNOWN;
};
