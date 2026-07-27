/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import * as useAbortableAsyncModule from '@kbn/react-hooks';
import { TraceWaterfallWithFetching } from './trace_waterfall_with_fetching';
import * as TraceWaterfallModule from '.';
import * as useGetServiceBadgeHrefFromCoreModule from './use_get_service_badge_href_from_core';

jest.mock('@kbn/react-hooks', () => ({
  useAbortableAsync: jest.fn(),
}));

jest.mock('.', () => ({
  TraceWaterfall: jest.fn(() => <div data-test-subj="traceWaterfall" />),
}));

jest.mock('./use_get_service_badge_href_from_core', () => ({
  useGetServiceBadgeHrefFromCore: jest.fn(),
}));

const mockUseAbortableAsync = useAbortableAsyncModule.useAbortableAsync as jest.Mock;
const mockTraceWaterfall = TraceWaterfallModule.TraceWaterfall as jest.Mock;
const mockUseGetServiceBadgeHrefFromCore =
  useGetServiceBadgeHrefFromCoreModule.useGetServiceBadgeHrefFromCore as jest.Mock;

const mockGetServiceBadgeHref = jest.fn();
const mockCallApmApi = jest.fn();
const mockOnNodeClick = jest.fn();
const mockOnErrorClick = jest.fn();
const mockCore = {
  application: {
    getUrlForApp: jest.fn().mockReturnValue('/app/apm/services/my-service/overview'),
  },
} as any;

const mockData = {
  traceItems: [{ id: 'item-1' }],
  errors: [{ id: 'error-1' }],
  agentMarks: { marks: 42 },
  traceDocsTotal: 100,
  maxTraceItems: 5000,
};

const defaultProps = {
  traceId: 'trace-123',
  rangeFrom: '2025-01-01T00:00:00.000Z',
  rangeTo: '2025-01-01T01:00:00.000Z',
  core: mockCore,
  callApmApi: mockCallApmApi,
  onNodeClick: mockOnNodeClick,
  onErrorClick: mockOnErrorClick,
  serviceName: 'my-service',
  ebt: {
    row: { element: 'waterfall_row' },
    errorBadge: { element: 'waterfall_error_badge' },
    serviceBadge: { element: 'waterfall_service_badge' },
  },
};

const renderComponent = (props = {}) =>
  render(
    <I18nProvider>
      <TraceWaterfallWithFetching {...defaultProps} {...props} />
    </I18nProvider>
  );

describe('TraceWaterfallWithFetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetServiceBadgeHrefFromCore.mockReturnValue(mockGetServiceBadgeHref);
  });

  it('shows loading indicator while pending', () => {
    mockUseAbortableAsync.mockReturnValue({ value: undefined, loading: true });

    renderComponent();

    expect(screen.getByTestId('traceWaterfallLoading')).toBeInTheDocument();
    expect(mockTraceWaterfall).not.toHaveBeenCalled();
  });

  it('shows loading indicator on initial mount before fetch starts', () => {
    mockUseAbortableAsync.mockReturnValue({ value: undefined, loading: false });

    renderComponent();

    expect(screen.getByTestId('traceWaterfallLoading')).toBeInTheDocument();
    expect(mockTraceWaterfall).not.toHaveBeenCalled();
  });

  it('shows error callout when fetch fails with an error', () => {
    mockUseAbortableAsync.mockReturnValue({
      value: undefined,
      loading: false,
      error: new Error('fetch failed'),
    });

    renderComponent();

    expect(screen.getByTestId('TraceWaterfallEmbeddableNoData')).toBeInTheDocument();
    expect(mockTraceWaterfall).not.toHaveBeenCalled();
  });

  it('renders TraceWaterfall when data is available', () => {
    mockUseAbortableAsync.mockReturnValue({ value: mockData, loading: false });

    renderComponent();

    expect(screen.getByTestId('traceWaterfall')).toBeInTheDocument();
  });

  it('passes the fetched data and props to TraceWaterfall', () => {
    mockUseAbortableAsync.mockReturnValue({ value: mockData, loading: false });

    renderComponent();

    expect(mockTraceWaterfall).toHaveBeenCalledWith(
      expect.objectContaining({
        traceItems: mockData.traceItems,
        errors: mockData.errors,
        agentMarks: mockData.agentMarks,
        traceDocsTotal: mockData.traceDocsTotal,
        maxTraceItems: mockData.maxTraceItems,
        onClick: mockOnNodeClick,
        onErrorClick: mockOnErrorClick,
        serviceName: 'my-service',
        isEmbeddable: true,
        showLegend: true,
        showCriticalPathControl: true,
        ebt: defaultProps.ebt,
        getServiceBadgeHref: mockGetServiceBadgeHref,
      }),
      {}
    );
  });

  it('calls useGetServiceBadgeHrefFromCore with core, rangeFrom and rangeTo', () => {
    mockUseAbortableAsync.mockReturnValue({ value: mockData, loading: false });

    renderComponent();

    expect(mockUseGetServiceBadgeHrefFromCore).toHaveBeenCalledWith(
      mockCore,
      defaultProps.rangeFrom,
      defaultProps.rangeTo
    );
  });

  it('calls callApmApi with the correct endpoint and params', () => {
    mockUseAbortableAsync.mockImplementation((fn) => {
      fn({ signal: undefined });
      return { value: mockData, loading: false };
    });

    renderComponent();

    expect(mockCallApmApi).toHaveBeenCalledWith('GET /internal/apm/unified_traces/{traceId}', {
      signal: undefined,
      params: {
        path: { traceId: defaultProps.traceId },
        query: {
          start: defaultProps.rangeFrom,
          end: defaultProps.rangeTo,
        },
      },
    });
  });

  it('re-runs useAbortableAsync when traceId, rangeFrom or rangeTo change', () => {
    mockUseAbortableAsync.mockReturnValue({ value: mockData, loading: false });

    renderComponent();

    expect(mockUseAbortableAsync).toHaveBeenCalledWith(expect.any(Function), [
      defaultProps.rangeFrom,
      defaultProps.rangeTo,
      defaultProps.traceId,
    ]);
  });

  it('forwards scrollElement and extra scroll props to TraceWaterfall', () => {
    const scrollElement = document.createElement('div');
    mockUseAbortableAsync.mockReturnValue({ value: mockData, loading: false });

    renderComponent({ scrollElement, contextSpanIds: ['span-1'] });

    expect(mockTraceWaterfall).toHaveBeenCalledWith(
      expect.objectContaining({
        scrollElement,
        contextSpanIds: ['span-1'],
      }),
      {}
    );
  });
});
