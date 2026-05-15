/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm } from '@elastic/apm-rum';
import { EsqlResponseError } from './esql_response_error';
import { isSuppressedFetchError } from './is_suppressed_fetch_error';

/** APM label identifying which chart-section call site produced an error. */
export type ChartSectionErrorSource = 'useFetchMetricsData' | 'useLensProps';

/** APM `error_type` label for non-render captures (vs. SectionFatalReactError). */
export const CHART_SECTION_ERROR_TYPE_LABEL = 'ChartSectionNonRenderError';

interface ReportChartSectionErrorArgs {
  error: unknown;
  source: ChartSectionErrorSource;
  /** Optional correlation labels (e.g. `profile_id`, `chart_id`) merged into the APM payload. */
  labels?: Record<string, string>;
}

/**
 * Reports a non-render chart-section error to APM.
 * No-ops on `AbortError` (per `isSuppressedFetchError`) and non-Error values.
 */
export const reportChartSectionError = ({
  error,
  source,
  labels: callerLabels,
}: ReportChartSectionErrorArgs): void => {
  if (isSuppressedFetchError(error)) {
    return;
  }
  if (!(error instanceof Error)) {
    return;
  }

  const labels: Record<string, string> = {
    error_type: CHART_SECTION_ERROR_TYPE_LABEL,
    chart_section_source: source,
  };
  if (error instanceof EsqlResponseError) {
    if (error.type) {
      labels.esql_error_type = error.type;
    }
    if (error.status != null) {
      labels.esql_status = String(error.status);
    }
  }
  if (callerLabels) {
    // Drop undefined / empty values.
    for (const [key, value] of Object.entries(callerLabels)) {
      if (value !== undefined && value !== '') {
        labels[key] = value;
      }
    }
  }

  // `apm.captureError` alone doesn't mark the surrounding transaction failed.
  // Mirror lens/data_loader.ts: attach a failed child span around the capture.
  const span = apm.getCurrentTransaction()?.startSpan(
    'chart-section-non-render-error',
    'chart-section'
  );
  span?.addLabels(labels);
  apm.captureError(error, { labels });
  if (span) {
    // @ts-expect-error RUM types do not expose `outcome` on Span.
    span.outcome = 'failure';
    span.end();
  }
};
