/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Context } from '@opentelemetry/api';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
/**
 * This processor allows consumers to register Span processors after startup,
 * which is useful if processors should be conditionally applied based on config
 * or runtime logic.
 */
export declare class LateBindingSpanProcessor implements tracing.SpanProcessor {
  #private;
  private constructor();
  onStart(span: tracing.Span, parentContext: Context): void;
  onEnd(span: tracing.ReadableSpan): void;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
  register(processor: tracing.SpanProcessor): () => Promise<void>;
  static register(processor: tracing.SpanProcessor): () => Promise<void>;
  static get(): LateBindingSpanProcessor;
}
