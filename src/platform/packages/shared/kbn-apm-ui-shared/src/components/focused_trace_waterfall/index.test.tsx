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
import { FocusedTraceWaterfallFetcher } from '.';
import type { APMClient } from '@kbn/apm-api-client';

const mockUseAbortableAsync = jest.fn();

jest.mock('@kbn/react-hooks', () => ({
  useAbortableAsync: (...args: unknown[]) => mockUseAbortableAsync(...args),
}));

jest.mock('./focused_trace_waterfall_viewer', () => ({
  FocusedTraceWaterfallViewer: ({ items }: { items: unknown }) => (
    <div data-test-subj="FocusedTraceWaterfallViewer">FocusedTraceWaterfallViewer</div>
  ),
}));

jest.mock('../trace_waterfall/loading', () => ({
  Loading: () => <div data-test-subj="Loading">Loading</div>,
}));

describe('FocusedTraceWaterfallFetcher', () => {
  const mockCallApmApi = jest.fn() as jest.MockedFunction<APMClient>;
  const defaultProps = {
    callApmApi: mockCallApmApi,
    traceId: 'test-trace-id',
    rangeFrom: '2024-01-01T00:00:00.000Z',
    rangeTo: '2024-01-01T01:00:00.000Z',
    docId: 'test-doc-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when loading', () => {
    it('should render the Loading component', () => {
      mockUseAbortableAsync.mockReturnValue({
        loading: true,
        error: undefined,
        value: undefined,
      });

      render(<FocusedTraceWaterfallFetcher {...defaultProps} />);

      expect(screen.getByTestId('Loading')).toBeInTheDocument();
      expect(screen.queryByTestId('FocusedTraceWaterfallViewer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('FocusedTraceWaterfallEmbeddableNoData')).not.toBeInTheDocument();
    });
  });

  describe('when there is an error', () => {
    it('should render the error callout', () => {
      mockUseAbortableAsync.mockReturnValue({
        loading: false,
        error: new Error('Test error'),
        value: undefined,
      });

      render(<FocusedTraceWaterfallFetcher {...defaultProps} />);

      expect(screen.getByTestId('FocusedTraceWaterfallEmbeddableNoData')).toBeInTheDocument();
      expect(screen.getByText('Focused trace waterfall could not be loaded.')).toBeInTheDocument();
      expect(screen.queryByTestId('Loading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('FocusedTraceWaterfallViewer')).not.toBeInTheDocument();
    });
  });

  describe('when value is undefined', () => {
    it('should render the error callout', () => {
      mockUseAbortableAsync.mockReturnValue({
        loading: false,
        error: undefined,
        value: undefined,
      });

      render(<FocusedTraceWaterfallFetcher {...defaultProps} />);

      expect(screen.getByTestId('FocusedTraceWaterfallEmbeddableNoData')).toBeInTheDocument();
      expect(screen.getByText('Focused trace waterfall could not be loaded.')).toBeInTheDocument();
    });
  });

  describe('when data is loaded successfully', () => {
    it('should render the FocusedTraceWaterfallViewer', () => {
      const mockValue = {
        traceItems: {
          rootDoc: { id: 'root-doc-id' },
          focusedTraceDoc: { id: 'focused-doc-id' },
          parentDoc: null,
          focusedTraceTree: [],
        },
        summary: {
          services: 1,
          traceEvents: 1,
          errors: 0,
        },
      };

      mockUseAbortableAsync.mockReturnValue({
        loading: false,
        error: undefined,
        value: mockValue,
      });

      render(<FocusedTraceWaterfallFetcher {...defaultProps} />);

      expect(screen.getByTestId('FocusedTraceWaterfallViewer')).toBeInTheDocument();
      expect(screen.queryByTestId('Loading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('FocusedTraceWaterfallEmbeddableNoData')).not.toBeInTheDocument();
    });
  });

  describe('useAbortableAsync hook', () => {
    it('should be called with the correct dependencies', () => {
      mockUseAbortableAsync.mockReturnValue({
        loading: true,
        error: undefined,
        value: undefined,
      });

      render(<FocusedTraceWaterfallFetcher {...defaultProps} />);

      expect(mockUseAbortableAsync).toHaveBeenCalledWith(expect.any(Function), [
        defaultProps.callApmApi,
        defaultProps.traceId,
        defaultProps.rangeFrom,
        defaultProps.rangeTo,
        defaultProps.docId,
      ]);
    });

    it('should call the API with correct parameters when callback is invoked', async () => {
      mockUseAbortableAsync.mockReturnValue({
        loading: true,
        error: undefined,
        value: undefined,
      });

      render(<FocusedTraceWaterfallFetcher {...defaultProps} />);

      // Get the callback function passed to useAbortableAsync
      const callback = mockUseAbortableAsync.mock.calls[0][0];
      const mockSignal = new AbortController().signal;

      // Invoke the callback
      await callback({ signal: mockSignal });

      expect(mockCallApmApi).toHaveBeenCalledWith(
        'GET /internal/apm/unified_traces/{traceId}/summary',
        {
          params: {
            path: { traceId: defaultProps.traceId },
            query: {
              start: defaultProps.rangeFrom,
              end: defaultProps.rangeTo,
              docId: defaultProps.docId,
            },
          },
          signal: mockSignal,
        }
      );
    });
  });
});
