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
import type { OutgoingHttpHeaders } from 'http';

export function maybeInitAutoInstrumentations() {
  // Register OpenTelemetry auto-instrumentations once per process.
  // NOTE: these instrumentations must not be enabled alongside Elastic APM.
  const INSTRUMENTATIONS_REGISTERED = Symbol.for('kbn.tracing.instrumentations_registered');
  if (!(globalThis as any)[INSTRUMENTATIONS_REGISTERED]) {
    (globalThis as any)[INSTRUMENTATIONS_REGISTERED] = true;
    registerInstrumentations({
      instrumentations: [
        // Create incoming HTTP server spans and extract trace context + baggage.
        new HttpInstrumentation({
          // Only create outgoing spans when there is an active parent span.
          // This keeps noise down and ensures spans remain connected to request traces.
          requireParentforOutgoingSpans: true,
          // Discard spans for Elasticsearch requests because they are already instrumented by the library.
          ignoreOutgoingRequestHook: (request) => {
            const headers = (request.headers || {}) as OutgoingHttpHeaders;
            // Default headers for the ES client: https://github.com/elastic/kibana/blob/8c43c76a8b76eedc622307c544466f9024c4251c/src/core/packages/elasticsearch/client-server-internal/src/headers.ts#L64-L69
            const isElasticsearch =
              headers['x-elastic-product-origin'] === 'kibana' &&
              headers['user-agent']?.startsWith('Kibana/') === true;
            return isElasticsearch;
          },
        }),
        // require a parent so we don't create a new trace per request.
        new UndiciInstrumentation({
          requireParentforSpans: true,
        }),
      ],
    });
  }
}
