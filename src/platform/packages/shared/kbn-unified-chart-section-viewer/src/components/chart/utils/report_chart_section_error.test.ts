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
import {
  CHART_SECTION_ERROR_TYPE_LABEL,
  reportChartSectionError,
} from './report_chart_section_error';

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

describe('reportChartSectionError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentTransactionMock.mockReturnValue(undefined);
  });

  it('is a no-op when error is undefined', () => {
    reportChartSectionError({
      error: undefined,
      source: 'useFetchMetricsData',
    });

    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('is a no-op when error is a non-Error value', () => {
    reportChartSectionError({
      error: 'plain string',
      source: 'useFetchMetricsData',
    });

    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('is a no-op for AbortError (preserves isSuppressedFetchError semantics)', () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';

    reportChartSectionError({
      error: abortError,
      source: 'useFetchMetricsData',
    });

    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('reports a plain Error to APM', () => {
    const plainError = new Error('network blew up');

    reportChartSectionError({
      error: plainError,
      source: 'useFetchMetricsData',
    });

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
      labels: {
        error_type: CHART_SECTION_ERROR_TYPE_LABEL,
        chart_section_source: 'useFetchMetricsData',
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

    reportChartSectionError({
      error: esqlError,
      source: 'useLensProps',
    });

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(esqlError, {
      labels: {
        error_type: CHART_SECTION_ERROR_TYPE_LABEL,
        chart_section_source: 'useLensProps',
        esql_error_type: 'verification_exception',
        esql_status: '400',
      },
    });
  });

  it('omits esql labels when EsqlResponseError fields are absent', () => {
    const esqlError = new EsqlResponseError({ reason: 'no type, no status' });

    reportChartSectionError({
      error: esqlError,
      source: 'useLensProps',
    });

    expect(captureErrorMock).toHaveBeenCalledWith(esqlError, {
      labels: {
        error_type: CHART_SECTION_ERROR_TYPE_LABEL,
        chart_section_source: 'useLensProps',
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

    reportChartSectionError({
      error: plainError,
      source: 'useLensProps',
    });

    expect(transaction.startSpan).toHaveBeenCalledTimes(1);
    expect(transaction.startSpan).toHaveBeenCalledWith(
      'chart-section-non-render-error',
      'chart-section'
    );
    expect(span.addLabels).toHaveBeenCalledWith({
      error_type: CHART_SECTION_ERROR_TYPE_LABEL,
      chart_section_source: 'useLensProps',
    });
    expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
      labels: {
        error_type: CHART_SECTION_ERROR_TYPE_LABEL,
        chart_section_source: 'useLensProps',
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

    reportChartSectionError({
      error: plainError,
      source: 'useLensProps',
    });

    expect(transaction.startSpan).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
      labels: {
        error_type: CHART_SECTION_ERROR_TYPE_LABEL,
        chart_section_source: 'useLensProps',
      },
    });
  });

  describe('caller-supplied labels', () => {
    it('merges caller labels into the APM payload', () => {
      const plainError = new Error('boom');

      reportChartSectionError({
        error: plainError,
        source: 'useLensProps',
        labels: {
          profile_id: 'metrics-experience',
          chart_id: 'system.cpu.total.norm.pct',
        },
      });

      expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
        labels: {
          error_type: CHART_SECTION_ERROR_TYPE_LABEL,
          chart_section_source: 'useLensProps',
          profile_id: 'metrics-experience',
          chart_id: 'system.cpu.total.norm.pct',
        },
      });
    });

    it('attaches caller labels to the failure span when one is active', () => {
      const span = createMockSpan();
      const transaction = createMockTransaction(span);
      getCurrentTransactionMock.mockReturnValue(
        transaction as unknown as ReturnType<typeof apm.getCurrentTransaction>
      );

      reportChartSectionError({
        error: new Error('boom'),
        source: 'useFetchMetricsData',
        labels: {
          profile_id: 'metrics-experience',
        },
      });

      expect(span.addLabels).toHaveBeenCalledWith({
        error_type: CHART_SECTION_ERROR_TYPE_LABEL,
        chart_section_source: 'useFetchMetricsData',
        profile_id: 'metrics-experience',
      });
    });

    it('drops undefined and empty-string label values so APM is not polluted', () => {
      const plainError = new Error('boom');

      reportChartSectionError({
        error: plainError,
        source: 'useFetchMetricsData',
        labels: {
          profile_id: '',
          chart_id: undefined as unknown as string,
          valid_label: 'kept',
        },
      });

      expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
        labels: {
          error_type: CHART_SECTION_ERROR_TYPE_LABEL,
          chart_section_source: 'useFetchMetricsData',
          valid_label: 'kept',
        },
      });
    });

    it('preserves EsqlResponseError fields alongside caller labels', () => {
      const esqlError = new EsqlResponseError(
        {
          type: 'verification_exception',
          reason: 'unknown column x',
          root_cause: [{ type: 'verification_exception', reason: 'unknown column x' }],
        },
        { status: 400 }
      );

      reportChartSectionError({
        error: esqlError,
        source: 'useLensProps',
        labels: { profile_id: 'metrics-experience' },
      });

      expect(captureErrorMock).toHaveBeenCalledWith(esqlError, {
        labels: {
          error_type: CHART_SECTION_ERROR_TYPE_LABEL,
          chart_section_source: 'useLensProps',
          esql_error_type: 'verification_exception',
          esql_status: '400',
          profile_id: 'metrics-experience',
        },
      });
    });
  });
});
