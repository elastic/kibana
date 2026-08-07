/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm } from '@elastic/apm-rum';
import type { Logger } from '@kbn/logging';
import { loggerMock } from '@kbn/logging-mocks';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { EsqlResponseError } from '../../../common/errors/esql_response_error';
import {
  ExternalServicesProvider,
  type ExternalServices,
} from '../../../context/external_services';
import { ERROR_TYPE } from '../../../utils/error_labels';
import {
  type ReportChartSectionErrorArgs,
  useReportChartSectionError,
} from './use_report_chart_section_error';

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

const renderReporter = (externalServices?: ExternalServices) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ExternalServicesProvider externalServices={externalServices}>
      {children}
    </ExternalServicesProvider>
  );
  const { result } = renderHook(() => useReportChartSectionError(), { wrapper });
  return (args: ReportChartSectionErrorArgs) => result.current(args);
};

describe('useReportChartSectionError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentTransactionMock.mockReturnValue(undefined);
  });

  const PROFILE_ID = 'metrics-experience';

  it('is a no-op when error is undefined', () => {
    const reportError = renderReporter();
    reportError({
      error: undefined,
      source: 'useFetchMetricsData',
      labels: { profile_id: PROFILE_ID },
    });

    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('is a no-op when error is a non-Error value', () => {
    const reportError = renderReporter();
    reportError({
      error: 'plain string',
      source: 'useFetchMetricsData',
      labels: { profile_id: PROFILE_ID },
    });

    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('is a no-op for AbortError (preserves isSuppressedFetchError semantics)', () => {
    const reportError = renderReporter();
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';

    reportError({
      error: abortError,
      source: 'useFetchMetricsData',
      labels: { profile_id: PROFILE_ID },
    });

    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('reports a plain Error to APM', () => {
    const reportError = renderReporter();
    const plainError = new Error('network blew up');

    reportError({
      error: plainError,
      source: 'useFetchMetricsData',
      labels: { profile_id: PROFILE_ID },
    });

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
      labels: {
        error_type: ERROR_TYPE.CHART_SECTION_NON_RENDER_ERROR,
        chart_section_source: 'useFetchMetricsData',
        profile_id: PROFILE_ID,
      },
    });
  });

  it('includes EsqlResponseError metadata in APM labels', () => {
    const reportError = renderReporter();
    const esqlError = new EsqlResponseError(
      {
        type: 'verification_exception',
        reason: 'unknown column x',
        root_cause: [{ type: 'verification_exception', reason: 'unknown column x' }],
      },
      { status: 400 }
    );

    reportError({
      error: esqlError,
      source: 'useLensProps',
      labels: { profile_id: PROFILE_ID },
    });

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(esqlError, {
      labels: {
        error_type: ERROR_TYPE.CHART_SECTION_NON_RENDER_ERROR,
        chart_section_source: 'useLensProps',
        esql_error_type: 'verification_exception',
        esql_status: '400',
        profile_id: PROFILE_ID,
      },
    });
  });

  it('omits esql labels when EsqlResponseError fields are absent', () => {
    const reportError = renderReporter();
    const esqlError = new EsqlResponseError({ reason: 'no type, no status' });

    reportError({
      error: esqlError,
      source: 'useLensProps',
      labels: { profile_id: PROFILE_ID },
    });

    expect(captureErrorMock).toHaveBeenCalledWith(esqlError, {
      labels: {
        error_type: ERROR_TYPE.CHART_SECTION_NON_RENDER_ERROR,
        chart_section_source: 'useLensProps',
        profile_id: PROFILE_ID,
      },
    });
  });

  it('marks the active APM transaction as failure via a child span', () => {
    const span = createMockSpan();
    const transaction = createMockTransaction(span);
    getCurrentTransactionMock.mockReturnValue(
      transaction as unknown as ReturnType<typeof apm.getCurrentTransaction>
    );

    const reportError = renderReporter();
    const plainError = new Error('build failed');

    reportError({
      error: plainError,
      source: 'useLensProps',
      labels: { profile_id: PROFILE_ID },
    });

    expect(transaction.startSpan).toHaveBeenCalledTimes(1);
    expect(transaction.startSpan).toHaveBeenCalledWith(
      'chart-section-non-render-error',
      'chart-section'
    );
    expect(span.addLabels).toHaveBeenCalledWith({
      error_type: ERROR_TYPE.CHART_SECTION_NON_RENDER_ERROR,
      chart_section_source: 'useLensProps',
      profile_id: PROFILE_ID,
    });
    expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
      labels: {
        error_type: ERROR_TYPE.CHART_SECTION_NON_RENDER_ERROR,
        chart_section_source: 'useLensProps',
        profile_id: PROFILE_ID,
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

    const reportError = renderReporter();
    const plainError = new Error('build failed');

    reportError({
      error: plainError,
      source: 'useLensProps',
      labels: { profile_id: PROFILE_ID },
    });

    expect(transaction.startSpan).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
      labels: {
        error_type: ERROR_TYPE.CHART_SECTION_NON_RENDER_ERROR,
        chart_section_source: 'useLensProps',
        profile_id: PROFILE_ID,
      },
    });
  });

  it('swallows reporting failures and routes them through the package logger', () => {
    const logger: Logger = loggerMock.create();
    const reportingFailure = new Error('apm transport down');
    captureErrorMock.mockImplementationOnce(() => {
      throw reportingFailure;
    });

    const reportError = renderReporter({ logger });

    expect(() =>
      reportError({
        error: new Error('boom'),
        source: 'useFetchMetricsData',
        labels: { profile_id: PROFILE_ID },
      })
    ).not.toThrow();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(reportingFailure, {
      labels: {
        error_type: ERROR_TYPE.APM_REPORTING_FAILURE,
        chart_section_source: 'useFetchMetricsData',
      },
    });
  });

  it('swallows reporting failures silently when no logger is wired into context', () => {
    const reportingFailure = new Error('apm transport down');
    captureErrorMock.mockImplementationOnce(() => {
      throw reportingFailure;
    });

    const reportError = renderReporter();

    expect(() =>
      reportError({
        error: new Error('boom'),
        source: 'useFetchMetricsData',
        labels: { profile_id: PROFILE_ID },
      })
    ).not.toThrow();
  });

  describe('caller-supplied labels', () => {
    it('merges caller labels into the APM payload', () => {
      const reportError = renderReporter();
      const plainError = new Error('boom');

      reportError({
        error: plainError,
        source: 'useLensProps',
        labels: {
          profile_id: 'metrics-experience',
          chart_id: 'system.cpu.total.norm.pct',
        },
      });

      expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
        labels: {
          error_type: ERROR_TYPE.CHART_SECTION_NON_RENDER_ERROR,
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

      const reportError = renderReporter();

      reportError({
        error: new Error('boom'),
        source: 'useFetchMetricsData',
        labels: {
          profile_id: 'metrics-experience',
        },
      });

      expect(span.addLabels).toHaveBeenCalledWith({
        error_type: ERROR_TYPE.CHART_SECTION_NON_RENDER_ERROR,
        chart_section_source: 'useFetchMetricsData',
        profile_id: 'metrics-experience',
      });
    });

    it('drops undefined and empty-string label values so APM is not polluted', () => {
      const reportError = renderReporter();
      const plainError = new Error('boom');

      // `profile_id` is typed as a required string and `chart_id` as optional,
      // but the type system can't catch every runtime case (e.g. an upstream
      // ref hasn't been hydrated yet). The merge loop is the defense-in-depth
      // guard that keeps placeholder values out of APM.
      reportError({
        error: plainError,
        source: 'useFetchMetricsData',
        labels: {
          profile_id: '',
          chart_id: undefined,
        },
      });

      expect(captureErrorMock).toHaveBeenCalledWith(plainError, {
        labels: {
          error_type: ERROR_TYPE.CHART_SECTION_NON_RENDER_ERROR,
          chart_section_source: 'useFetchMetricsData',
        },
      });
    });

    it('does not let caller-supplied labels override reserved label keys', () => {
      // The `ChartSectionErrorLabels` type prevents callers from passing
      // `error_type`, `chart_section_source`, or the `esql_*` keys at compile
      // time. This test guards the runtime merge order so a caller that
      // bypasses the type (e.g., spreading from `any`) can never overwrite
      // the values the reporter owns.
      const esqlError = new EsqlResponseError(
        {
          type: 'verification_exception',
          reason: 'unknown column x',
          root_cause: [{ type: 'verification_exception', reason: 'unknown column x' }],
        },
        { status: 400 }
      );

      const hostileLabels = {
        profile_id: 'metrics-experience',
        error_type: 'spoofed-error-type',
        chart_section_source: 'spoofed-source',
        esql_error_type: 'spoofed-esql-type',
        esql_status: 'spoofed-esql-status',
      } as unknown as ReportChartSectionErrorArgs['labels'];

      const reportError = renderReporter();

      reportError({
        error: esqlError,
        source: 'useLensProps',
        labels: hostileLabels,
      });

      expect(captureErrorMock).toHaveBeenCalledWith(esqlError, {
        labels: {
          error_type: ERROR_TYPE.CHART_SECTION_NON_RENDER_ERROR,
          chart_section_source: 'useLensProps',
          esql_error_type: 'verification_exception',
          esql_status: '400',
          profile_id: 'metrics-experience',
        },
      });
    });

    it('preserves EsqlResponseError fields alongside caller labels', () => {
      const reportError = renderReporter();
      const esqlError = new EsqlResponseError(
        {
          type: 'verification_exception',
          reason: 'unknown column x',
          root_cause: [{ type: 'verification_exception', reason: 'unknown column x' }],
        },
        { status: 400 }
      );

      reportError({
        error: esqlError,
        source: 'useLensProps',
        labels: { profile_id: 'metrics-experience' },
      });

      expect(captureErrorMock).toHaveBeenCalledWith(esqlError, {
        labels: {
          error_type: ERROR_TYPE.CHART_SECTION_NON_RENDER_ERROR,
          chart_section_source: 'useLensProps',
          esql_error_type: 'verification_exception',
          esql_status: '400',
          profile_id: 'metrics-experience',
        },
      });
    });
  });
});
