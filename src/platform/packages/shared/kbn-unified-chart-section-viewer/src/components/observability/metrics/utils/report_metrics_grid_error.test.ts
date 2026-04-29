/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm } from '@elastic/apm-rum';
import { EsqlResponseError } from './esql_response_error';
import { METRICS_GRID_ERROR_TYPE_LABEL, reportMetricsGridError } from './report_metrics_grid_error';

jest.mock('@elastic/apm-rum', () => ({
  apm: {
    captureError: jest.fn(),
    getCurrentTransaction: jest.fn(),
  },
}));

const captureErrorMock = apm.captureError as jest.MockedFunction<typeof apm.captureError>;
const getCurrentTransactionMock = apm.getCurrentTransaction as jest.MockedFunction<
  typeof apm.getCurrentTransaction
>;

interface MockSpan {
  addLabels: jest.Mock;
  end: jest.Mock;
  outcome?: string;
}

interface MockTransaction {
  startSpan: jest.Mock;
}

const createMockSpan = (): MockSpan => ({
  addLabels: jest.fn(),
  end: jest.fn(),
});

const createMockTransaction = (span: MockSpan | undefined): MockTransaction => ({
  startSpan: jest.fn().mockReturnValue(span),
});

describe('reportMetricsGridError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no active transaction. Tests that exercise the span path
    // override this explicitly so the default keeps existing assertions
    // (which only check `apm.captureError`) honest.
    getCurrentTransactionMock.mockReturnValue(undefined);
  });

  it('is a no-op when error is undefined', () => {
    reportMetricsGridError({
      error: undefined,
      source: 'useFetchMetricsData',
    });

    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('is a no-op when error is a non-Error value', () => {
    reportMetricsGridError({
      error: 'plain string',
      source: 'useFetchMetricsData',
    });

    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('is a no-op for AbortError (preserves isSuppressedFetchError semantics)', () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';

    reportMetricsGridError({
      error: abortError,
      source: 'useFetchMetricsData',
    });

    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('reports a plain Error to APM', () => {
    const plainError = new Error('network blew up');

    reportMetricsGridError({
      error: plainError,
      source: 'useFetchMetricsData',
    });

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
      labels: {
        error_type: METRICS_GRID_ERROR_TYPE_LABEL,
        metrics_grid_source: 'useFetchMetricsData',
      },
    });
  });

  it('includes EsqlResponseError metadata in APM labels', () => {
    const esqlError = new EsqlResponseError(
      {
        type: 'verification_exception',
        reason: 'unknown column x',
        root_cause: [{ type: 'verification_exception', reason: 'unknown column x' }],
      },
      { status: 400 }
    );

    reportMetricsGridError({
      error: esqlError,
      source: 'useLensProps',
    });

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(esqlError, {
      labels: {
        error_type: METRICS_GRID_ERROR_TYPE_LABEL,
        metrics_grid_source: 'useLensProps',
        esql_error_type: 'verification_exception',
        esql_status: '400',
      },
    });
  });

  it('omits esql labels when EsqlResponseError fields are absent', () => {
    const esqlError = new EsqlResponseError({ reason: 'no type, no status' });

    reportMetricsGridError({
      error: esqlError,
      source: 'useLensProps',
    });

    expect(captureErrorMock).toHaveBeenCalledWith(esqlError, {
      labels: {
        error_type: METRICS_GRID_ERROR_TYPE_LABEL,
        metrics_grid_source: 'useLensProps',
      },
    });
  });

  it('marks the active APM transaction as failure via a child span', () => {
    const span = createMockSpan();
    const transaction = createMockTransaction(span);
    getCurrentTransactionMock.mockReturnValue(
      transaction as unknown as ReturnType<typeof apm.getCurrentTransaction>
    );

    const plainError = new Error('build failed');

    reportMetricsGridError({
      error: plainError,
      source: 'useLensProps',
    });

    expect(transaction.startSpan).toHaveBeenCalledTimes(1);
    expect(transaction.startSpan).toHaveBeenCalledWith(
      'metrics-grid-non-render-error',
      'metrics-grid'
    );
    expect(span.addLabels).toHaveBeenCalledWith({
      error_type: METRICS_GRID_ERROR_TYPE_LABEL,
      metrics_grid_source: 'useLensProps',
    });
    // captureError must run inside the span lifecycle so the RUM agent
    // associates the captured error with the failed span.
    expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
      labels: {
        error_type: METRICS_GRID_ERROR_TYPE_LABEL,
        metrics_grid_source: 'useLensProps',
      },
    });
    expect(span.outcome).toBe('failure');
    expect(span.end).toHaveBeenCalledTimes(1);
  });

  it('falls back to a plain captureError when startSpan returns undefined', () => {
    const transaction = createMockTransaction(undefined);
    getCurrentTransactionMock.mockReturnValue(
      transaction as unknown as ReturnType<typeof apm.getCurrentTransaction>
    );

    const plainError = new Error('build failed');

    reportMetricsGridError({
      error: plainError,
      source: 'useLensProps',
    });

    expect(transaction.startSpan).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
      labels: {
        error_type: METRICS_GRID_ERROR_TYPE_LABEL,
        metrics_grid_source: 'useLensProps',
      },
    });
  });
});
