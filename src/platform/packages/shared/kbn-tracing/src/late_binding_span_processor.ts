/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Context } from '@opentelemetry/api';
import { pull } from 'lodash';
import { tracing } from '@elastic/opentelemetry-node/sdk';

const noop = async () => {};

/**
 * This processor allows consumers to register Span processors after startup,
 * which is useful if processors should be conditionally applied based on config
 * or runtime logic.
 */
export class LateBindingSpanProcessor implements tracing.SpanProcessor {
  static #instance?: LateBindingSpanProcessor;

  #processors: tracing.SpanProcessor[] = [];

  private constructor() {}

  onStart(span: tracing.Span, parentContext: Context): void {
    this.#processors.forEach((processor) => processor.onStart(span, parentContext));
  }

  onEnd(span: tracing.ReadableSpan): void {
    this.#processors.forEach((processor) => processor.onEnd(span));
  }

  async forceFlush(): Promise<void> {
    await Promise.all(this.#processors.map((processor) => processor.forceFlush()));
  }
  async shutdown(): Promise<void> {
    await Promise.all(this.#processors.map((processor) => processor.shutdown()));
  }

  register(processor: tracing.SpanProcessor) {
    this.#processors.push(processor);

    return async () => {
      pull(this.#processors, processor);
      await processor.shutdown();
    };
  }

  static register(processor: tracing.SpanProcessor): () => Promise<void> {
    return this.#instance?.register(processor) ?? noop;
  }

  static get() {
    if (!this.#instance) {
      this.#instance = new LateBindingSpanProcessor();
    }
    return this.#instance;
  }
}
