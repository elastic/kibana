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
export const reportChartSectionError = ({ error, source }: ReportChartSectionErrorArgs): void => {
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

  // `apm.captureError` on its own does not flip the surrounding RUM
  // transaction to `outcome: 'failure'`. Mirror the pattern in
  // `x-pack/platform/plugins/shared/lens/public/react_embeddable/data_loader.ts`
  // (PR #265354) by attaching a child span, capturing the error inside it,
  // and explicitly marking the span as failed so APM dashboards correlate
  // the error with a failed unit of work. If there is no active transaction
  // (e.g. unit-test environments or callers outside a managed transaction)
  // fall back to a plain capture so the error is never dropped.
  const transaction = apm.getCurrentTransaction();
  if (transaction) {
    const span = transaction.startSpan('chart-section-non-render-error', 'chart-section');
    if (span) {
      span.addLabels(labels);
      apm.captureError(error, { labels });
      // @ts-expect-error RUM types do not expose `outcome` on Span, but the
      // RUM agent reads it when present (see lens data_loader for the same
      // workaround).
      span.outcome = 'failure';
      span.end();
    } else {
      apm.captureError(error, { labels });
    }
  } else {
    apm.captureError(error, { labels });
  }
};
