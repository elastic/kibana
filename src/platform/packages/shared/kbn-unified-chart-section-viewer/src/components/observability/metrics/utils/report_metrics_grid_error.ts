/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm } from '@elastic/apm-rum';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import { EsqlResponseError } from './esql_response_error';
import { isSuppressedFetchError } from './is_suppressed_fetch_error';
import { METRICS_GRID_NON_RENDER_ERROR_EVENT_TYPE } from '../telemetry/constants';

/**
 * Identifies which metrics-grid code path produced a non-render error.
 * Used as an APM label so failures can be split by origin in dashboards.
 */
export type MetricsGridErrorSource = 'useFetchMetricsData' | 'useLensProps';

/**
 * `component_name` value used for every non-render APM capture emitted by
 * the metrics grid. Matches the identifier the ticket spec called out so
 * APM dashboards keyed on `component_name` can find these events alongside
 * React boundary captures.
 */
export const METRICS_GRID_COMPONENT_NAME = 'MetricsExperienceGrid';

/**
 * APM label value used to distinguish metrics-grid non-render error
 * captures from the existing React `SectionFatalReactError` /
 * `PageFatalReactError` taxonomy emitted by
 * `@kbn/shared-ux-error-boundary`.
 */
export const METRICS_GRID_ERROR_TYPE_LABEL = 'MetricsGridNonRenderError';

interface ReportMetricsGridErrorArgs {
  error: unknown;
  source: MetricsGridErrorSource;
  analytics?: Pick<AnalyticsServiceStart, 'reportEvent'>;
}

/**
 * Reports a non-render metrics-grid error to APM and, if analytics is
 * available, to EBT using the dedicated `metrics_grid_non_render_error`
 * schema registered by this package. A dedicated schema (rather than
 * reusing `fatal-error-react` from `@kbn/shared-ux-error-boundary`)
 * avoids polluting render-boundary dashboards with placeholder values
 * for fields that do not apply to non-render errors.
 *
 * Preserves the existing `AbortError` suppression semantics from
 * `isSuppressedFetchError` — user-driven cancellations are dropped
 * silently. Non-`Error` values are also ignored.
 *
 * This util is intentionally side-effect-only and does not re-throw.
 */
export const reportMetricsGridError = ({
  error,
  source,
  analytics,
}: ReportMetricsGridErrorArgs): void => {
  if (isSuppressedFetchError(error)) {
    return;
  }
  if (!(error instanceof Error)) {
    return;
  }

  const labels: Record<string, string> = {
    error_type: METRICS_GRID_ERROR_TYPE_LABEL,
    metrics_grid_source: source,
  };
  if (error instanceof EsqlResponseError) {
    if (error.type) {
      labels.esql_error_type = error.type;
    }
    if (error.status != null) {
      labels.esql_status = String(error.status);
    }
  }

  apm.captureError(error, { labels });

  if (!analytics) {
    return;
  }

  try {
    const payload: Record<string, string> = {
      source,
      error_type: error.name,
      error_message: error.message,
    };
    if (typeof error.stack === 'string') {
      payload.error_stack = error.stack;
    }
    if (error instanceof EsqlResponseError) {
      if (error.type) {
        payload.esql_error_type = error.type;
      }
      if (error.status != null) {
        payload.esql_status = String(error.status);
      }
    }
    analytics.reportEvent(METRICS_GRID_NON_RENDER_ERROR_EVENT_TYPE, payload);
  } catch (reportErr) {
    // Mirror the swallowing pattern in shared-ux/error_boundary/src/services/error_service.ts
    // so a malformed analytics service cannot mask the original error.
    // eslint-disable-next-line no-console
    console.error(reportErr);
  }
};
