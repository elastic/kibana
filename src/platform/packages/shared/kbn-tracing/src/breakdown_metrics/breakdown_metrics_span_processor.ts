/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-node';
import { Histogram } from '@opentelemetry/api-metrics';
import { pick } from 'lodash';
import { BreakdownMetricsSpanSelfActivity } from './types';
import { calculateSelfTime } from './calculate_self_time';

export interface BreakdownMetricSpanProcessorOptions {
  histogram: Histogram;
  limit: number;
  dimensions: string[];
}
/**
 * Calculates and reports breakdown metrics for spans. See:
 * https://www.elastic.co/docs/solutions/observability/apm/metrics#_breakdown_metrics
 */
export class BreakdownMetricsSpanProcessor implements SpanProcessor {
  constructor(private options: BreakdownMetricSpanProcessorOptions) {}

  private spanActivity: Map<string, BreakdownMetricsSpanSelfActivity> = new Map();

  onStart(span: Span): void {
    const spanId = span.spanContext().spanId;

    this.spanActivity.set(spanId, {
      endedSpans: [],
      runningSpans: new Map(),
    });

    const parentId = span.parentSpanContext?.spanId;

    if (!parentId) {
      return;
    }

    const parentActivity = this.spanActivity.get(parentId);

    parentActivity?.runningSpans.set(span.spanContext(), span);
  }
  onEnd(span: ReadableSpan): void {
    const spanContext = span.spanContext();
    const spanId = spanContext.spanId;

    const parentId = span.parentSpanContext?.spanId;

    if (parentId) {
      const parentActivity = this.spanActivity.get(parentId);

      parentActivity?.runningSpans.delete(spanContext);

      parentActivity?.endedSpans.push({
        start: span.startTime,
        end: span.endTime,
      });
    }

    const activity = this.spanActivity.get(spanId);

    if (activity) {
      const selfTime = calculateSelfTime({
        span,
        activity,
      });

      const attrs = pick(span.attributes, this.options.dimensions);

      this.options.histogram.record(selfTime, attrs);
    }

    this.spanActivity.delete(spanId);
  }
  async shutdown(): Promise<void> {}
  async forceFlush(): Promise<void> {}
}
