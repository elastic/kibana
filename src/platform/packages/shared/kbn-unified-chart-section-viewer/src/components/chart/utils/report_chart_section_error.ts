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

/**
 * Identifies which chart-section code path produced a non-render error.
 * Used as an APM label so failures can be split by origin in dashboards.
 *
 * The shared chart hook (`useLensProps`) is consumed by both the metrics
 * grid and the traces grid, so the source enum mixes a chart-shared
 * value with grid-specific values. Add new entries here when a new
 * grid-specific call site needs to report through this util.
 */
export type ChartSectionErrorSource = 'useFetchMetricsData' | 'useLensProps';

/**
 * APM label value used to distinguish chart-section non-render error
 * captures from the existing React `SectionFatalReactError` /
 * `PageFatalReactError` taxonomy emitted by
 * `@kbn/shared-ux-error-boundary`.
 *
 * Named `ChartSection` (not `MetricsGrid`) because `useLensProps` —
 * one of the call sites — is shared across the metrics grid and the
 * traces grid; a metrics-grid-only label would mislabel trace failures.
 */
export const CHART_SECTION_ERROR_TYPE_LABEL = 'ChartSectionNonRenderError';

interface ReportChartSectionErrorArgs {
  error: unknown;
  source: ChartSectionErrorSource;
  /**
   * Caller-supplied correlation labels (e.g. `profile_id`, `chart_id`) that
   * help split error captures by upstream context in APM dashboards. Merged
   * in last so call sites can override the built-in `error_type` /
   * `chart_section_source` keys if absolutely necessary, but call sites
   * should not normally need to do that. Values must be strings — APM RUM
   * labels do not accept arbitrary types.
   *
   * Added in response to PR #265380 review feedback: without these, the
   * Errors view in APM has no labels to filter by, making per-profile
   * triage difficult.
   */
  labels?: Record<string, string>;
}

/**
 * Reports a non-render chart-section error to APM. Per guidance from the
 * Observability/EBT stakeholders (see PR #265380 review feedback), EBT is
 * intended for product-usage analytics rather than observability /
 * monitoring, so monitoring-style error reporting goes through APM (or
 * logs) only.
 *
 * Preserves the existing `AbortError` suppression semantics from
 * `isSuppressedFetchError` — user-driven cancellations are dropped
 * silently. Non-`Error` values are also ignored.
 *
 * This util is intentionally side-effect-only and does not re-throw.
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
