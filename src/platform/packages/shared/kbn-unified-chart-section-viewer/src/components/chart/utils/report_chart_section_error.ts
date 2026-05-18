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

/**
 * Correlation labels merged into the APM payload alongside the error.
 *
 * `profile_id` is required: it identifies which data source profile owns the
 * failing chart section and is the only label that lets us filter these
 * events in APM. `chart_id` is optional because not every call site has a
 * stable chart identifier (e.g. the grid-level fetch).
 */
interface ChartSectionErrorLabels {
  profile_id: string;
  chart_id?: string;
}

interface ReportChartSectionErrorArgs {
  error: unknown;
  source: ChartSectionErrorSource;
  labels: ChartSectionErrorLabels;
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

  // Best-effort: APM reporting must never break the host app. If `@elastic/apm-rum`
  // throws (e.g. transport failure, internal error) swallow it silently.
  try {
    const labels: Record<string, string> = {};
    // Drop undefined / empty values so APM is not polluted with placeholder
    // labels (e.g., an unset `chart_id`). Caller labels are written first so
    // that the reserved keys assigned below (`error_type`,
    // `chart_section_source`, `esql_*`) always win on collision and cannot be
    // overridden by a caller bypassing the `ChartSectionErrorLabels` type.
    for (const [key, value] of Object.entries(callerLabels)) {
      if (value !== undefined && value !== '') {
        labels[key] = value;
      }
    }
    labels.error_type = CHART_SECTION_ERROR_TYPE_LABEL;
    labels.chart_section_source = source;
    if (error instanceof EsqlResponseError) {
      if (error.type) {
        labels.esql_error_type = error.type;
      }
      if (error.status != null) {
        labels.esql_status = String(error.status);
      }
    }

    // `apm.captureError` alone doesn't mark the surrounding transaction failed.
    // Mirror lens/data_loader.ts: attach a failed child span around the capture.
    const span = apm
      .getCurrentTransaction()
      ?.startSpan('chart-section-non-render-error', 'chart-section');
    span?.addLabels(labels);
    apm.captureError(error, { labels });
    if (span) {
      // @ts-expect-error RUM types do not expose `outcome` on Span.
      span.outcome = 'failure';
      span.end();
    }
  } catch {
    // Intentionally swallow: telemetry reporting failures must not propagate.
  }
};
