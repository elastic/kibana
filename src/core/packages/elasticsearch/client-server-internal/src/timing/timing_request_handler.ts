/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { performance } from 'perf_hooks';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { OnRequestHandler } from '../create_transport';

/**
 * Returns an {@link OnRequestHandler} that instruments ES request timing
 * and stores timing context for response-phase measurement.
 *
 * @param kibanaRequest - Optional KibanaRequest to attach Server-Timing measurements to
 * @returns Handler that sets timing context in options.context
 *
 * @internal
 */
export function getTimingRequestHandler(kibanaRequest?: KibanaRequest): OnRequestHandler {
  return (_ctx, _params, options, _receivedLogger) => {
    if (!options.context) {
      options.context = {};
    }
    (options.context as any).timingContext = {
      startTime: performance.now(),
      kibanaRequest,
    };
  };
}
