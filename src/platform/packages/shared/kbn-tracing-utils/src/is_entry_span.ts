/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SpanKind } from '@opentelemetry/api';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

/**
 * Determines whether a Span is an entry span. See:
 * https://github.com/elastic/apm/blob/main/specs/agents/tracing-api-otel.md#spans-and-transactions
 */
export function isEntrySpan(span: ReadableSpan) {
  return (
    span.kind === SpanKind.SERVER ||
    span.kind === SpanKind.CONSUMER ||
    span.parentSpanContext === undefined ||
    span.parentSpanContext.isRemote
  );
}
