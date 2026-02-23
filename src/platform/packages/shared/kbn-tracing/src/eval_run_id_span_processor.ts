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
import { EVAL_RUN_ID_BAGGAGE_KEY } from '@kbn/inference-tracing';

const noop = async () => {};

/**
 * Copies the eval run id (when present in W3C baggage) onto *all* spans as an attribute.
 *
 * This enables correlating traces (`traces-*`) with eval score docs (`.kibana-evaluations*`)
 * by filtering on `attributes.kibana.evals.run_id`.
 */
export class EvalRunIdSpanProcessor implements tracing.SpanProcessor {
  onStart(span: tracing.Span, parentContext: Context): void {
    const evalRunId = propagation
      .getBaggage(parentContext)
      ?.getEntry(EVAL_RUN_ID_BAGGAGE_KEY)?.value;

    if (!evalRunId || !span.isRecording?.()) {
      return;
    }

    // Use the same dotted key so it lands under `attributes.kibana.evals.run_id` in OTEL indices.
    span.setAttribute(EVAL_RUN_ID_BAGGAGE_KEY, String(evalRunId));
  }

  onEnd(_span: tracing.ReadableSpan): void {}

  async forceFlush(): Promise<void> {
    await noop();
  }

  async shutdown(): Promise<void> {
    await noop();
  }
}
