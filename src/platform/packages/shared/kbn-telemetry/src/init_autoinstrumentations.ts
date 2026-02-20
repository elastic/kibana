/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { HapiInstrumentation } from '@opentelemetry/instrumentation-hapi';

export function maybeInitAutoInstrumentations() {
  /**
   * Auto-instrumentation is intentionally opt-in.
   *
   * It can increase trace volume significantly, and Kibana generally relies on explicit
   * instrumentation for tracing. For evals, enabling this provides request-scoped context
   * propagation (so W3C baggage like `kibana.evals.run_id` can be extracted and attached).
   */
  if (process.env.KBN_OTEL_AUTO_INSTRUMENTATIONS === 'true') {
    // Register OpenTelemetry auto-instrumentations once per process.
    // NOTE: these instrumentations must not be enabled alongside Elastic APM.
    const INSTRUMENTATIONS_REGISTERED = Symbol.for('kbn.tracing.instrumentations_registered');
    if (!(globalThis as any)[INSTRUMENTATIONS_REGISTERED]) {
      (globalThis as any)[INSTRUMENTATIONS_REGISTERED] = true;
      registerInstrumentations({
        instrumentations: [
          // Kibana runs on Hapi. This instrumentation gives us higher-level request spans
          // and ensures context propagation for request-scoped correlation (like eval run ids).
          new HapiInstrumentation(),
          // Create incoming HTTP server spans and extract trace context + baggage.
          new HttpInstrumentation({
            // Only create outgoing spans when there is an active parent span.
            // This keeps noise down and ensures spans remain connected to request traces.
            requireParentforOutgoingSpans: true,
          }),
          // undici is used by Elasticsearch client; require a parent so we don't create a new trace per request.
          new UndiciInstrumentation({
            requireParentforSpans: true,
          }),
        ],
      });
    }
  }
}
