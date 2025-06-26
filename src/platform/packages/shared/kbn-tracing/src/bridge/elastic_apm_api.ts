/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ATTR_SPAN_TYPE, ATTR_TRANSACTION_TYPE } from '@kbn/opentelemetry-attributes';
import { flattenToAttributes, toTraceparent } from '@kbn/opentelemetry-utils';
import {
  AttributeValue,
  Attributes,
  Context,
  Span,
  Tracer,
  context,
  propagation,
  trace,
} from '@opentelemetry/api';
import { ReadableSpan, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { mapKeys, mapValues } from 'lodash';
import { LateBindingSpanProcessor } from '../late_binding_span_processor';

type StartSpan = (spanName: string, spanType?: string) => Span;

export interface ElasticTransactionApi {
  span: Span;
  startSpan: StartSpan;
  setLabel(label: string, value: AttributeValue | null | undefined, stringify?: boolean): void;
  addLabels(labels: Attributes): void;
}

export interface ElasticApmApi {
  addLabels(labels: Attributes, stringify?: boolean): boolean;
  setTransactionName(name: string): void;
  startTransaction(
    name: string,
    type: string,
    options?: { childOf?: string }
  ): ElasticTransactionApi;
  startSpan: StartSpan;
  setGlobalLabel(name: string, value: AttributeValue): void;
  captureError(error: Error): void;
  currentTraceIds: {
    'trace.id'?: string | undefined;
    'span.id'?: string | undefined;
    'transaction.id'?: string | undefined;
  };
  isStarted(): boolean;
  setCustomContext(context: Attributes): void;
  currentTransaction: Span | undefined;
  currentSpan: Span | undefined;
  currentTraceparent: string | undefined;
}

export interface ElasticTracingContext {
  activeEntrySpan?: Span;
  activeSpan?: Span;
}

export function createElasticApmApi({
  tracer,
  getElasticTracingContext,
}: {
  tracer: Tracer;
  getElasticTracingContext: () => ElasticTracingContext;
}): ElasticApmApi {
  const globalLabels: Record<string, AttributeValue> = {};

  class GlobalLabelsSpanProcessor implements SpanProcessor {
    onStart(span: Span, parentContext: Context): void {
      span.setAttributes(globalLabels);
    }
    onEnd(span: ReadableSpan): void {}
    async shutdown(): Promise<void> {}
    async forceFlush(): Promise<void> {}
  }

  LateBindingSpanProcessor.register(new GlobalLabelsSpanProcessor());

  return {
    addLabels(labels: Attributes, stringify: boolean = true) {
      const entrySpan = getElasticTracingContext().activeEntrySpan;
      const keyedLabels = mapKeys(labels, (label) => `labels.${label}`);

      if (stringify) {
        const stringified = mapValues(keyedLabels, (val) =>
          val !== null && val !== undefined ? String(val) : val
        );
        entrySpan?.setAttributes(stringified);
      } else {
        entrySpan?.setAttributes(keyedLabels);
      }
      return !!entrySpan;
    },
    setCustomContext: (ctx) => {
      const entrySpan = getElasticTracingContext().activeEntrySpan;
      const flattenedContext = flattenToAttributes({ context: ctx });
      entrySpan?.setAttributes(flattenedContext);

      return !!entrySpan;
    },
    setTransactionName: (name) => {
      const entrySpan = getElasticTracingContext().activeEntrySpan;
      entrySpan?.updateName(name);
    },
    startTransaction(name, type, opts) {
      const activeCtx = context.active();
      const parentCtx =
        (opts && opts.childOf && propagation.extract(activeCtx, { traceparent: opts.childOf })) ||
        context.active();

      const span = tracer.startSpan(
        name,
        type ? { attributes: { [ATTR_TRANSACTION_TYPE]: type } } : {},
        parentCtx
      );

      const nextCtx = trace.setSpanContext(parentCtx, span.spanContext());

      return {
        span,
        setLabel(label, value, stringify = true) {
          if (value !== null && value !== undefined) {
            span.setAttribute(`labels.${label}`, stringify ? String(value) : value);
          }
        },
        startSpan(spanName, spanType) {
          const next = tracer.startSpan(
            spanName,
            { attributes: { [ATTR_SPAN_TYPE]: spanType } },
            nextCtx
          );
          return next;
        },
        addLabels(labels) {
          span.setAttributes(mapKeys(labels, (key) => `labels.${key}`));
        },
      };
    },
    startSpan(name, type) {
      const span = tracer.startSpan(name, { attributes: { [ATTR_TRANSACTION_TYPE]: type } });
      trace.setSpanContext(context.active(), span.spanContext());
      return span;
    },
    get currentTraceIds() {
      const activeSpanContext = trace.getSpanContext(context.active());
      return {
        'trace.id': activeSpanContext?.traceId,
        'span.id': activeSpanContext?.spanId,
        'transaction.id': getElasticTracingContext().activeEntrySpan?.spanContext().spanId,
      };
    },
    captureError(error) {
      trace.getActiveSpan()?.recordException(error);
    },
    isStarted() {
      return true;
    },
    setGlobalLabel(label, value) {
      globalLabels[`global_labels.${label}`] = value;
    },
    get currentTransaction() {
      const ctx = getElasticTracingContext();
      return ctx.activeEntrySpan;
    },
    get currentSpan() {
      const ctx = getElasticTracingContext();
      return ctx.activeSpan;
    },
    get currentTraceparent() {
      const spanCtx = getElasticTracingContext().activeSpan?.spanContext();
      return spanCtx ? toTraceparent(spanCtx) : undefined;
    },
  };
}
