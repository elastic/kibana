/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm } from '@elastic/apm-rum';

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

interface ReportFetchErrorParams {
  error: unknown;
  operationId: string;
}

/**
 * Captures a single, filterable APM RUM event for a failed fetch,
 * tagged with a `kibana_meta_operation_id` label so the failure can be filtered
 * per surface in APM. No-ops on `AbortError` and non-Error values.
 *
 * Surfaces using this should display the toast/inline message via the
 * non-capturing `toasts.add({ color: 'danger' })` instead of `toasts.addDanger`
 * to avoid double-capturing the error (`toasts.addDanger` captures its own
 * low-fidelity `ToastDanger` APM event).
 */
export const reportFetchError = ({ error, operationId }: ReportFetchErrorParams): void => {
  if (!(error instanceof Error) || isAbortError(error)) return;

  apm.captureError(error, { labels: { kibana_meta_operation_id: operationId } });
};
