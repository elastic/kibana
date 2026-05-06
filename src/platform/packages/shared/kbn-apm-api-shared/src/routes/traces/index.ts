/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { unifiedTracesByIdRoute } from './unified_traces_by_id';
import { unifiedTracesByIdSummaryRoute } from './unified_traces_by_id_summary';
import { unifiedTracesByIdErrorsRoute } from './unified_traces_by_id_errors';

export const tracesRouteDefinitions = {
  unifiedTracesById: unifiedTracesByIdRoute,
  unifiedTracesByIdSummary: unifiedTracesByIdSummaryRoute,
  unifiedTracesByIdErrors: unifiedTracesByIdErrorsRoute,
};

export type { UnifiedTracesByIdResponse } from './unified_traces_by_id';
export type { UnifiedTracesByIdSummaryResponse } from './unified_traces_by_id_summary';
