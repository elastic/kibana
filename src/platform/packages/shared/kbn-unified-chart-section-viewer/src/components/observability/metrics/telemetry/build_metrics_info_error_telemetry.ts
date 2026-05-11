/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlResponseError } from '../utils/esql_response_error';

/**
 * Structured payload emitted on every non-aborted METRICS_INFO fetch failure.
 *
 * Only stable classifiers are included — no free-form message/reason text, which
 * is the most likely place for PII or sensitive query fragments. Counts and
 * categories suffice for failure-rate dashboards and class-level slicing.
 */
export interface MetricsInfoErrorTelemetry {
  /** JS `Error.name` (e.g. `EsqlResponseError`, `Error`). `UnknownError` for non-Error throwables. */
  error_name: string;
  /** HTTP-ish status code, when the error carried one (e.g. EsqlResponseError 400/500). */
  status?: number;
  /** Elasticsearch error type from the embedded response body (e.g. `verification_exception`). */
  es_error_type?: string;
}

/**
 * Maps an unknown thrown value from the METRICS_INFO fetch into a structured
 * telemetry payload. Centralizing this here keeps the call site in
 * `useFetchMetricsData` small and gives the future refactor in #260667 a single
 * place to update when the error model normalizes.
 */
export const buildMetricsInfoErrorTelemetry = (error: unknown): MetricsInfoErrorTelemetry => {
  if (error instanceof EsqlResponseError) {
    const payload: MetricsInfoErrorTelemetry = { error_name: error.name };
    if (typeof error.status === 'number') {
      payload.status = error.status;
    }
    if (error.type) {
      payload.es_error_type = error.type;
    }
    return payload;
  }

  if (error instanceof Error) {
    return { error_name: error.name };
  }

  return { error_name: 'UnknownError' };
};
