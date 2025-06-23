/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Context, context, trace } from '@opentelemetry/api';
import { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ElasticTracingContext } from './bridge/elastic_apm_api';
import { isEntrySpan } from './utils/is_entry_span';

export class ContextTrackingProcessor implements SpanProcessor {
  #entrySpanMap: Map<string, Span> = new Map();

  async forceFlush(): Promise<void> {}
  async shutdown(): Promise<void> {}
  onStart(span: Span, parentContext: Context): void {
    const parentSpanContext = trace.getSpan(parentContext)?.spanContext();

    const entrySpan = isEntrySpan(span)
      ? span
      : parentSpanContext
      ? this.#entrySpanMap.get(parentSpanContext.spanId)
      : undefined;

    if (entrySpan) {
      this.#entrySpanMap.set(span.spanContext().spanId, entrySpan);
    }
  }

  onEnd(span: ReadableSpan): void {
    this.#entrySpanMap.delete(span.spanContext().spanId);
  }

  getElasticTracingContext(): ElasticTracingContext {
    const activeSpan = trace.getSpan(context.active());
    const activeSpanContext = activeSpan?.spanContext();

    const activeEntrySpan = activeSpanContext
      ? this.#entrySpanMap.get(activeSpanContext?.spanId)
      : undefined;

    return {
      activeEntrySpan,
      activeSpan,
    };
  }
}
