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
import { FocusedTraceWaterfallWithFetching } from './focused_trace_waterfall_with_fetching';
import * as FocusedTraceWaterfallModule from '.';
import * as useGetServiceBadgeHrefFromCoreModule from '../trace_waterfall/use_get_service_badge_href_from_core';

jest.mock('@kbn/react-hooks', () => ({
  useAbortableAsync: jest.fn(),
}));

jest.mock('.', () => ({
  FocusedTraceWaterfall: jest.fn(() => <div data-test-subj="focusedTraceWaterfall" />),
}));

jest.mock('../trace_waterfall/use_get_service_badge_href_from_core', () => ({
  useGetServiceBadgeHrefFromCore: jest.fn(),
}));

const mockUseAbortableAsync = useAbortableAsyncModule.useAbortableAsync as jest.Mock;
const mockFocusedTraceWaterfall = FocusedTraceWaterfallModule.FocusedTraceWaterfall as jest.Mock;
const mockUseGetServiceBadgeHrefFromCore =
  useGetServiceBadgeHrefFromCoreModule.useGetServiceBadgeHrefFromCore as jest.Mock;

const mockGetServiceBadgeHref = jest.fn();
const mockCallApmApi = jest.fn();
const mockCore = {
  application: {
    getUrlForApp: jest.fn().mockReturnValue('/app/apm/services/my-service/overview'),
  },
} as any;

const mockData = {
  traceItems: null,
  summary: null,
};

const defaultProps = {
  traceId: 'trace-123',
  rangeFrom: '2025-01-01T00:00:00.000Z',
  rangeTo: '2025-01-01T01:00:00.000Z',
  core: mockCore,
  callApmApi: mockCallApmApi,
};

const renderComponent = (props = {}) =>
  render(
    <I18nProvider>
      <FocusedTraceWaterfallWithFetching {...defaultProps} {...props} />
    </I18nProvider>
  );

describe('FocusedTraceWaterfallWithFetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetServiceBadgeHrefFromCore.mockReturnValue(mockGetServiceBadgeHref);
  });

  it('shows loading indicator while pending', () => {
    mockUseAbortableAsync.mockReturnValue({ value: undefined, loading: true });

    renderComponent();

    expect(screen.getByTestId('traceWaterfallLoading')).toBeInTheDocument();
    expect(mockFocusedTraceWaterfall).not.toHaveBeenCalled();
  });

  it('shows error callout when fetch fails with an error', () => {
    mockUseAbortableAsync.mockReturnValue({
      value: undefined,
      loading: false,
      error: new Error('fetch failed'),
    });

    renderComponent();

    expect(screen.getByTestId('FocusedTraceWaterfallEmbeddableNoData')).toBeInTheDocument();
    expect(mockFocusedTraceWaterfall).not.toHaveBeenCalled();
  });

  it('renders FocusedTraceWaterfall when data is available', () => {
    mockUseAbortableAsync.mockReturnValue({ value: mockData, loading: false });

    renderComponent();

    expect(screen.getByTestId('focusedTraceWaterfall')).toBeInTheDocument();
  });

  it('passes the fetched data, isEmbeddable and service badge href to FocusedTraceWaterfall', () => {
    mockUseAbortableAsync.mockReturnValue({ value: mockData, loading: false });

    renderComponent();

    expect(mockFocusedTraceWaterfall).toHaveBeenCalledWith(
      expect.objectContaining({
        items: mockData,
        isEmbeddable: true,
        getServiceBadgeHref: mockGetServiceBadgeHref,
      }),
      {}
    );
  });

  it('forwards getErrorMarkerHref to FocusedTraceWaterfall when provided', () => {
    mockUseAbortableAsync.mockReturnValue({ value: mockData, loading: false });
    const mockGetErrorMarkerHref = jest.fn();

    renderComponent({ getErrorMarkerHref: mockGetErrorMarkerHref });

    expect(mockFocusedTraceWaterfall).toHaveBeenCalledWith(
      expect.objectContaining({
        getErrorMarkerHref: mockGetErrorMarkerHref,
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

  it('calls callApmApi with the correct endpoint and params, including docId', async () => {
    mockUseAbortableAsync.mockImplementation((fn) => {
      fn({ signal: undefined });
      return { value: mockData, loading: false };
    });

    renderComponent({ docId: 'doc-456' });

    expect(mockCallApmApi).toHaveBeenCalledWith(
      'GET /internal/apm/unified_traces/{traceId}/summary',
      {
        signal: undefined,
        params: {
          path: { traceId: defaultProps.traceId },
          query: {
            start: defaultProps.rangeFrom,
            end: defaultProps.rangeTo,
            docId: 'doc-456',
          },
        },
      }
    );
  });

  it('calls callApmApi without docId when it is not provided', () => {
    mockUseAbortableAsync.mockImplementation((fn) => {
      fn({ signal: undefined });
      return { value: mockData, loading: false };
    });

    renderComponent();

    expect(mockCallApmApi).toHaveBeenCalledWith(
      'GET /internal/apm/unified_traces/{traceId}/summary',
      {
        signal: undefined,
        params: {
          path: { traceId: defaultProps.traceId },
          query: {
            start: defaultProps.rangeFrom,
            end: defaultProps.rangeTo,
            docId: undefined,
          },
        },
      }
    );
  });

  it('re-runs useAbortableAsync when traceId, rangeFrom, rangeTo or docId change', () => {
    mockUseAbortableAsync.mockReturnValue({ value: mockData, loading: false });

    renderComponent({ docId: 'doc-1' });

    expect(mockUseAbortableAsync).toHaveBeenCalledWith(expect.any(Function), [
      'doc-1',
      defaultProps.rangeFrom,
      defaultProps.rangeTo,
      defaultProps.traceId,
    ]);
  });
});
