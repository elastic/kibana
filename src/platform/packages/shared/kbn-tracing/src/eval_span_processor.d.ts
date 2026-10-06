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
export declare class EvalSpanProcessor implements tracing.SpanProcessor {
  private readonly fields;
  constructor(fields: EvalBaggageField[]);
  onStart(span: tracing.Span, parentContext: Context): void;
  onEnd(_span: tracing.ReadableSpan): void;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}
