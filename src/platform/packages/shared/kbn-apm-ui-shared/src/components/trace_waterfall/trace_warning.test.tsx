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
import { TraceWarning } from './trace_warning';
import { TraceDataState } from './use_trace_waterfall';
import { useTraceWaterfallContext } from './trace_waterfall_context';

jest.mock('./trace_waterfall_context', () => ({
  useTraceWaterfallContext: jest.fn(),
}));

const mockUseTraceWaterfallContext = useTraceWaterfallContext as jest.MockedFunction<
  typeof useTraceWaterfallContext
>;

describe('TraceWarning', () => {
  const testChildContent = 'Test Child Content';
  const testMessage = 'Test warning message';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when traceState is Full', () => {
    it('should render only children without warning callout', () => {
      mockUseTraceWaterfallContext.mockReturnValue({
        traceState: TraceDataState.Full,
        message: testMessage,
      } as ReturnType<typeof useTraceWaterfallContext>);

      render(
        <TraceWarning>
          <div>{testChildContent}</div>
        </TraceWarning>
      );

      expect(screen.getByText(testChildContent)).toBeInTheDocument();
      expect(screen.queryByTestId('traceWarning')).not.toBeInTheDocument();
    });
  });

  describe('when traceState is Partial', () => {
    it('should render warning callout with the message and children', () => {
      mockUseTraceWaterfallContext.mockReturnValue({
        traceState: TraceDataState.Partial,
        message: testMessage,
      } as ReturnType<typeof useTraceWaterfallContext>);

      render(
        <TraceWarning>
          <div>{testChildContent}</div>
        </TraceWarning>
      );

      expect(screen.getByTestId('traceWarning')).toBeInTheDocument();
      expect(screen.getByText(testMessage)).toBeInTheDocument();
      expect(screen.getByText(testChildContent)).toBeInTheDocument();
    });

    it('should render warning callout with warning color', () => {
      mockUseTraceWaterfallContext.mockReturnValue({
        traceState: TraceDataState.Partial,
        message: testMessage,
      } as ReturnType<typeof useTraceWaterfallContext>);

      render(
        <TraceWarning>
          <div>{testChildContent}</div>
        </TraceWarning>
      );

      const callout = screen.getByTestId('traceWarning');
      expect(callout).toHaveClass('euiCallOut--warning');
    });
  });

  describe('when traceState is Empty', () => {
    it('should render warning callout with the message but no children', () => {
      mockUseTraceWaterfallContext.mockReturnValue({
        traceState: TraceDataState.Empty,
        message: testMessage,
      } as ReturnType<typeof useTraceWaterfallContext>);

      render(
        <TraceWarning>
          <div>{testChildContent}</div>
        </TraceWarning>
      );

      expect(screen.getByTestId('traceWarning')).toBeInTheDocument();
      expect(screen.getByText(testMessage)).toBeInTheDocument();
      expect(screen.queryByText(testChildContent)).not.toBeInTheDocument();
    });

    it('should render warning callout with warning color', () => {
      mockUseTraceWaterfallContext.mockReturnValue({
        traceState: TraceDataState.Empty,
        message: testMessage,
      } as ReturnType<typeof useTraceWaterfallContext>);

      render(
        <TraceWarning>
          <div>{testChildContent}</div>
        </TraceWarning>
      );

      const callout = screen.getByTestId('traceWarning');
      expect(callout).toHaveClass('euiCallOut--warning');
    });
  });

  describe('when traceState is Invalid', () => {
    it('should render danger callout with the message but no children', () => {
      mockUseTraceWaterfallContext.mockReturnValue({
        traceState: TraceDataState.Invalid,
        message: testMessage,
      } as ReturnType<typeof useTraceWaterfallContext>);

      render(
        <TraceWarning>
          <div>{testChildContent}</div>
        </TraceWarning>
      );

      expect(screen.getByTestId('traceWarning')).toBeInTheDocument();
      expect(screen.getByText(testMessage)).toBeInTheDocument();
      expect(screen.queryByText(testChildContent)).not.toBeInTheDocument();
    });

    it('should render callout with danger color', () => {
      mockUseTraceWaterfallContext.mockReturnValue({
        traceState: TraceDataState.Invalid,
        message: testMessage,
      } as ReturnType<typeof useTraceWaterfallContext>);

      render(
        <TraceWarning>
          <div>{testChildContent}</div>
        </TraceWarning>
      );

      const callout = screen.getByTestId('traceWarning');
      expect(callout).toHaveClass('euiCallOut--danger');
    });
  });
});
