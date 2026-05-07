/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { transactionErrorRateChartPreviewRoute } from './transaction_error_rate_chart_preview';
import { errorCountChartPreviewRoute } from './error_count_chart_preview';
import { transactionDurationChartPreviewRoute } from './transaction_duration_chart_preview';

export const alertsRouteDefinitions = {
  transactionErrorRateChartPreview: transactionErrorRateChartPreviewRoute,
  errorCountChartPreview: errorCountChartPreviewRoute,
  transactionDurationChartPreview: transactionDurationChartPreviewRoute,
};

export type {
  AlertParams,
  PreviewChartResponse,
  PreviewChartResponseItem,
} from './types';
export type { TransactionErrorRateChartPreviewResponse } from './transaction_error_rate_chart_preview';
export type { ErrorCountChartPreviewResponse } from './error_count_chart_preview';
export type { TransactionDurationChartPreviewResponse } from './transaction_duration_chart_preview';
