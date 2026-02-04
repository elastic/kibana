/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Context } from '@opentelemetry/api';
import { propagation } from '@opentelemetry/api';
import type { tracing } from '@elastic/opentelemetry-node/sdk';

const noop = async () => {};

export interface EvalBaggageField {
  baggageKey: string;
  attributeKey?: string;
}

/**
 * Copies configured eval baggage fields onto spans as attributes.
 *
 * This enables correlating traces (`traces-*`) with eval score docs
 * by filtering on `attributes.<attributeKey>`.
 */
export class EvalSpanProcessor implements tracing.SpanProcessor {
  constructor(private readonly fields: EvalBaggageField[]) {}

  onStart(span: tracing.Span, parentContext: Context): void {
    if (!span.isRecording?.()) {
      return;
    }

    const baggage = propagation.getBaggage(parentContext);
    if (!baggage) {
      return;
    }

    this.fields.forEach(({ baggageKey, attributeKey }) => {
      const value = baggage.getEntry(baggageKey)?.value;
      if (!value) {
        return;
      }

      span.setAttribute(attributeKey ?? baggageKey, String(value));
    });
  }

  onEnd(_span: tracing.ReadableSpan): void {}

  async forceFlush(): Promise<void> {
    await noop();
  }

  async shutdown(): Promise<void> {
    await noop();
  }
}
