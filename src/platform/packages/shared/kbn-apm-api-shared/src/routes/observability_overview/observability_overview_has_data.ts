/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { defineRoute } from '../types';

export interface ObservabilityOverviewHasDataResponse {
  hasData: boolean;
  indices: Readonly<{
    error: string;
    onboarding: string;
    span: string;
    transaction: string;
    metric: string;
  }>;
}

export const observabilityOverviewHasDataRoute =
  defineRoute<ObservabilityOverviewHasDataResponse>()({
    endpoint: 'GET /internal/apm/observability_overview/has_data',
  });
