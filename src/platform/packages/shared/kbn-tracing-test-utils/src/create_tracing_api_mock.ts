/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { TracingApi } from '@kbn/tracing';
import { ElasticApmApi } from '@kbn/tracing';
import { Tracer } from '@opentelemetry/api';

type MockedTracer = jest.Mocked<Tracer>;

/**
 * Mocked version of the Tracing API
 */
export type MockedTracingApi = Omit<jest.Mocked<TracingApi>, 'legacy' | 'getDefaultTracer'> & {
  legacy: jest.Mocked<ElasticApmApi>;
  getDefaultTracer: jest.SpyInstance<MockedTracer, []>;
};

/**
 * Creates a mocked version of the Tracing API
 */
export function createMockedTracingApi(): MockedTracingApi {
  return {
    forceFlush: jest.fn().mockResolvedValue(undefined),
    getDefaultTracer: jest.fn().mockImplementation((): Tracer => {
      return {
        startActiveSpan: jest.fn(),
        startSpan: jest.fn(),
      };
    }),
    legacy: {
      addLabels: jest.fn(),
      captureError: jest.fn(),
      currentSpan: undefined,
      currentTraceIds: {
        'span.id': undefined,
        'trace.id': undefined,
        'transaction.id': undefined,
      },
      currentTransaction: undefined,
      isStarted: jest.fn().mockReturnValue(true),
      setCustomContext: jest.fn(),
      setTransactionName: jest.fn(),
      startSpan: jest.fn(),
      startTransaction: jest.fn(),
      setGlobalLabel: jest.fn(),
      currentTraceparent: undefined,
    },
  };
}
