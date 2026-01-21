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
import { DocumentDetailFlyout, type DocumentDetailFlyoutProps } from './document_detail_flyout';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';

const mockSpanHit = buildDataTableRecord(
  {
    _id: 'span-doc-id',
    _index: 'traces-apm-default',
    _source: {
      '@timestamp': '2023-01-01T00:00:00.000Z',
      'span.name': 'test-span',
    },
  },
  dataViewMock
);

const mockLogHit = buildDataTableRecord(
  {
    _id: 'log-doc-id',
    _index: 'logs-default',
    _source: {
      '@timestamp': '2023-01-01T00:00:00.000Z',
      message: 'test log message',
    },
  },
  dataViewMock
);

const mockUseSpanFlyoutData = jest.fn();
const mockUseLogFlyoutData = jest.fn();

jest.mock('./span_flyout', () => ({
  spanFlyoutId: 'spanDetailFlyout',
  useSpanFlyoutData: (params: any) => mockUseSpanFlyoutData(params),
  SpanFlyoutContent: ({ hit, dataView, activeSection }: any) => (
    <div
      data-test-subj="spanFlyoutContent"
      data-hit-id={hit?.id}
      data-active-section={activeSection}
    >
      Span Flyout Content
    </div>
  ),
}));

jest.mock('./logs_flyout', () => ({
  logsFlyoutId: 'logsFlyout',
  useLogFlyoutData: (params: any) => mockUseLogFlyoutData(params),
  LogFlyoutContent: ({ hit, logDataView, error }: any) => (
    <div data-test-subj="logFlyoutContent" data-hit-id={hit?.id} data-error={error}>
      Log Flyout Content
    </div>
  ),
}));

jest.mock('.', () => ({
  WaterfallFlyout: ({ flyoutId, onCloseFlyout, dataView, hit, loading, title, children }: any) => (
    <div
      data-test-subj="waterfallFlyout"
      data-flyout-id={flyoutId}
      data-loading={loading}
      data-title={title}
      data-has-hit={!!hit}
    >
      {loading ? (
        <div data-test-subj="loadingSkeleton">Loading...</div>
      ) : hit ? (
        children
      ) : (
        <div data-test-subj="loadingSkeleton">No hit</div>
      )}
    </div>
  ),
}));

describe('DocumentDetailFlyout', () => {
  const defaultSpanProps: DocumentDetailFlyoutProps = {
    type: 'spanDetailFlyout',
    docId: 'test-span-id',
    traceId: 'test-trace-id',
    dataView: dataViewMock,
    onCloseFlyout: jest.fn(),
  };

  const defaultLogProps: DocumentDetailFlyoutProps = {
    type: 'logsFlyout',
    docId: 'test-log-id',
    traceId: 'test-trace-id',
    dataView: dataViewMock,
    onCloseFlyout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSpanFlyoutData.mockReturnValue({
      hit: mockSpanHit,
      loading: false,
      title: 'Span document',
    });

    mockUseLogFlyoutData.mockReturnValue({
      hit: mockLogHit,
      loading: false,
      title: 'Log document',
      error: null,
      logDataView: dataViewMock,
    });
  });

  describe('hook calls based on type', () => {
    it('should call useSpanFlyoutData with docId when type is span', () => {
      render(<DocumentDetailFlyout {...defaultSpanProps} />);

      expect(mockUseSpanFlyoutData).toHaveBeenCalledWith({
        spanId: 'test-span-id',
        traceId: 'test-trace-id',
      });
      expect(mockUseLogFlyoutData).toHaveBeenCalledWith({
        id: '',
      });
    });

    it('should call useLogFlyoutData with docId when type is log', () => {
      render(<DocumentDetailFlyout {...defaultLogProps} />);

      expect(mockUseSpanFlyoutData).toHaveBeenCalledWith({
        spanId: '',
        traceId: 'test-trace-id',
      });
      expect(mockUseLogFlyoutData).toHaveBeenCalledWith({
        id: 'test-log-id',
      });
    });
  });

  describe('content rendering based on type', () => {
    it('should render SpanFlyoutContent when type is span', () => {
      render(<DocumentDetailFlyout {...defaultSpanProps} />);

      expect(screen.getByTestId('spanFlyoutContent')).toBeInTheDocument();
      expect(screen.queryByTestId('logFlyoutContent')).not.toBeInTheDocument();
    });

    it('should render LogFlyoutContent when type is log', () => {
      render(<DocumentDetailFlyout {...defaultLogProps} />);

      expect(screen.getByTestId('logFlyoutContent')).toBeInTheDocument();
      expect(screen.queryByTestId('spanFlyoutContent')).not.toBeInTheDocument();
    });

    it('should pass activeSection to SpanFlyoutContent', () => {
      render(<DocumentDetailFlyout {...defaultSpanProps} activeSection="errors-table" />);

      const spanContent = screen.getByTestId('spanFlyoutContent');
      expect(spanContent).toHaveAttribute('data-active-section', 'errors-table');
    });
  });

  describe('WaterfallFlyout props', () => {
    it('should pass correct props to WaterfallFlyout for span type', () => {
      render(<DocumentDetailFlyout {...defaultSpanProps} />);

      const flyout = screen.getByTestId('waterfallFlyout');
      expect(flyout).toHaveAttribute('data-flyout-id', 'documentDetailFlyout');
      expect(flyout).toHaveAttribute('data-loading', 'false');
      expect(flyout).toHaveAttribute('data-title', 'Span document');
      expect(flyout).toHaveAttribute('data-has-hit', 'true');
    });

    it('should pass correct props to WaterfallFlyout for log type', () => {
      render(<DocumentDetailFlyout {...defaultLogProps} />);

      const flyout = screen.getByTestId('waterfallFlyout');
      expect(flyout).toHaveAttribute('data-flyout-id', 'documentDetailFlyout');
      expect(flyout).toHaveAttribute('data-loading', 'false');
      expect(flyout).toHaveAttribute('data-title', 'Log document');
      expect(flyout).toHaveAttribute('data-has-hit', 'true');
    });
  });

  describe('loading states', () => {
    it('should show loading state when span data is loading', () => {
      mockUseSpanFlyoutData.mockReturnValue({
        hit: null,
        loading: true,
        title: 'Span document',
      });

      render(<DocumentDetailFlyout {...defaultSpanProps} />);

      const flyout = screen.getByTestId('waterfallFlyout');
      expect(flyout).toHaveAttribute('data-loading', 'true');
      expect(screen.getByTestId('loadingSkeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('spanFlyoutContent')).not.toBeInTheDocument();
    });

    it('should show loading state when log data is loading', () => {
      mockUseLogFlyoutData.mockReturnValue({
        hit: null,
        loading: true,
        title: 'Log document',
        error: null,
        logDataView: null,
      });

      render(<DocumentDetailFlyout {...defaultLogProps} />);

      const flyout = screen.getByTestId('waterfallFlyout');
      expect(flyout).toHaveAttribute('data-loading', 'true');
      expect(screen.getByTestId('loadingSkeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('logFlyoutContent')).not.toBeInTheDocument();
    });

    it('should not render content when hit is null (even if not loading)', () => {
      mockUseSpanFlyoutData.mockReturnValue({
        hit: null,
        loading: false,
        title: 'Span document',
      });

      render(<DocumentDetailFlyout {...defaultSpanProps} />);

      expect(screen.queryByTestId('spanFlyoutContent')).not.toBeInTheDocument();
    });
  });

  describe('log flyout edge cases', () => {
    it('should render LogFlyoutContent with error when logData has error', () => {
      mockUseLogFlyoutData.mockReturnValue({
        hit: mockLogHit,
        loading: false,
        title: 'Log document',
        error: 'Failed to load data view',
        logDataView: dataViewMock,
      });

      render(<DocumentDetailFlyout {...defaultLogProps} />);

      const logContent = screen.getByTestId('logFlyoutContent');
      expect(logContent).toHaveAttribute('data-error', 'Failed to load data view');
    });

    it('should not render LogFlyoutContent when logDataView is null', () => {
      mockUseLogFlyoutData.mockReturnValue({
        hit: mockLogHit,
        loading: false,
        title: 'Log document',
        error: null,
        logDataView: null,
      });

      render(<DocumentDetailFlyout {...defaultLogProps} />);

      expect(screen.queryByTestId('logFlyoutContent')).not.toBeInTheDocument();
    });
  });

  describe('switching between types', () => {
    it('should correctly switch from span to log type', () => {
      const { rerender } = render(<DocumentDetailFlyout {...defaultSpanProps} />);

      expect(screen.getByTestId('spanFlyoutContent')).toBeInTheDocument();
      expect(screen.queryByTestId('logFlyoutContent')).not.toBeInTheDocument();

      rerender(<DocumentDetailFlyout {...defaultLogProps} />);

      expect(screen.queryByTestId('spanFlyoutContent')).not.toBeInTheDocument();
      expect(screen.getByTestId('logFlyoutContent')).toBeInTheDocument();
    });

    it('should correctly switch from log to span type', () => {
      const { rerender } = render(<DocumentDetailFlyout {...defaultLogProps} />);

      expect(screen.getByTestId('logFlyoutContent')).toBeInTheDocument();
      expect(screen.queryByTestId('spanFlyoutContent')).not.toBeInTheDocument();

      rerender(<DocumentDetailFlyout {...defaultSpanProps} />);

      expect(screen.getByTestId('spanFlyoutContent')).toBeInTheDocument();
      expect(screen.queryByTestId('logFlyoutContent')).not.toBeInTheDocument();
    });
  });
});
