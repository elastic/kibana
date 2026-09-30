/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Attributes, Counter, Histogram, UpDownCounter } from '@opentelemetry/api';

export interface RequestCompletionInstruments {
  activeRequests: Pick<UpDownCounter, 'add'>;
  requestDuration: Pick<Histogram, 'record'>;
  requestAborted: Pick<Counter, 'add'>;
}

export interface RequestMetricsRecorder {
  onDisconnect(request: object, attributes: Attributes, duration: number): void;
  onPostResponse(
    request: object,
    attributes: Attributes,
    duration: number,
    statusCode: number
  ): void;
}

/**
 * Records HTTP request completion metrics once per request.
 * `disconnect` and `onPostResponse` can both fire for the same request.
 */
export const createRequestMetricsRecorder = (
  instruments: RequestCompletionInstruments
): RequestMetricsRecorder => {
  const finishedRequests = new WeakSet<object>();

  const tryFinish = (request: object): boolean => {
    if (finishedRequests.has(request)) {
      return false;
    }
    finishedRequests.add(request);
    return true;
  };

  return {
    onDisconnect(request, attributes, duration) {
      if (!tryFinish(request)) {
        return;
      }

      instruments.requestAborted.add(1, attributes);
      instruments.activeRequests.add(-1, attributes);
      instruments.requestDuration.record(duration, {
        ...attributes,
        'error.type': 'aborted',
      });
    },
    onPostResponse(request, attributes, duration, statusCode) {
      if (!tryFinish(request)) {
        return;
      }

      instruments.activeRequests.add(-1, attributes);
      instruments.requestDuration.record(duration, {
        ...attributes,
        'http.response.status_code': statusCode,
      });
    },
  };
};
