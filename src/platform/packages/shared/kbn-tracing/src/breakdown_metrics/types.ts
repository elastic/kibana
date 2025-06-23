/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HrTime, SpanContext } from '@opentelemetry/api';
import { Span } from '@opentelemetry/sdk-trace-base';

export interface BreakdownMetricsEndedSpan {
  start: HrTime;
  end: HrTime;
}

export interface BreakdownMetricsSpanSelfActivity {
  endedSpans: BreakdownMetricsEndedSpan[];
  runningSpans: Map<SpanContext, Span>;
}
