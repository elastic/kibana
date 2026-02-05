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

const mockUseDocumentFlyoutData = jest.fn();

jest.mock('./use_document_flyout_data', () => ({
  useDocumentFlyoutData: (params: any) => mockUseDocumentFlyoutData(params),
}));

jest.mock('./span_flyout', () => ({
  spanFlyoutId: 'spanDetailFlyout',
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
  LogFlyoutContent: ({ hit, logDataView }: any) => (
    <div data-test-subj="logFlyoutContent" data-hit-id={hit?.id}>
      Log Flyout Content
    </div>
  ),
}));

jest.mock('.', () => ({
  WaterfallFlyout: ({ onCloseFlyout, dataView, hit, loading, title, children }: any) => (
    <div
      data-test-subj="waterfallFlyout"
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
  });

  describe('hook calls', () => {
    it('should call useDocumentFlyoutData with correct params for span type', () => {
      mockUseDocumentFlyoutData.mockReturnValue({
        type: 'spanDetailFlyout',
        hit: mockSpanHit,
        loading: false,
        title: 'Span document',
        logDataView: null,
        error: null,
      });

      render(<DocumentDetailFlyout {...defaultSpanProps} />);

      expect(mockUseDocumentFlyoutData).toHaveBeenCalledWith({
        type: 'spanDetailFlyout',
        docId: 'test-span-id',
        traceId: 'test-trace-id',
        docIndex: undefined,
      });
    });

    it('should call useDocumentFlyoutData with correct params for log type', () => {
      mockUseDocumentFlyoutData.mockReturnValue({
        type: 'logsFlyout',
        hit: mockLogHit,
        loading: false,
        title: 'Log document',
        logDataView: dataViewMock,
        error: null,
      });

      render(<DocumentDetailFlyout {...defaultLogProps} docIndex="logs-*" />);

      expect(mockUseDocumentFlyoutData).toHaveBeenCalledWith({
        type: 'logsFlyout',
        docId: 'test-log-id',
        traceId: 'test-trace-id',
        docIndex: 'logs-*',
      });
    });
  });

  describe('content rendering based on type', () => {
    it('should render SpanFlyoutContent when type is span', () => {
      mockUseDocumentFlyoutData.mockReturnValue({
        type: 'spanDetailFlyout',
        hit: mockSpanHit,
        loading: false,
        title: 'Span document',
        logDataView: null,
        error: null,
      });

      render(<DocumentDetailFlyout {...defaultSpanProps} />);

      expect(screen.getByTestId('spanFlyoutContent')).toBeInTheDocument();
      expect(screen.queryByTestId('logFlyoutContent')).not.toBeInTheDocument();
    });

    it('should render LogFlyoutContent when type is log', () => {
      mockUseDocumentFlyoutData.mockReturnValue({
        type: 'logsFlyout',
        hit: mockLogHit,
        loading: false,
        title: 'Log document',
        logDataView: dataViewMock,
        error: null,
      });

      render(<DocumentDetailFlyout {...defaultLogProps} />);

      expect(screen.getByTestId('logFlyoutContent')).toBeInTheDocument();
      expect(screen.queryByTestId('spanFlyoutContent')).not.toBeInTheDocument();
    });

    it('should pass activeSection to SpanFlyoutContent', () => {
      mockUseDocumentFlyoutData.mockReturnValue({
        type: 'spanDetailFlyout',
        hit: mockSpanHit,
        loading: false,
        title: 'Span document',
        logDataView: null,
        error: null,
      });

      render(<DocumentDetailFlyout {...defaultSpanProps} activeSection="errors-table" />);

      const spanContent = screen.getByTestId('spanFlyoutContent');
      expect(spanContent).toHaveAttribute('data-active-section', 'errors-table');
    });
  });

  describe('WaterfallFlyout props', () => {
    it('should pass correct props to WaterfallFlyout for span type', () => {
      mockUseDocumentFlyoutData.mockReturnValue({
        type: 'spanDetailFlyout',
        hit: mockSpanHit,
        loading: false,
        title: 'Span document',
        logDataView: null,
        error: null,
      });

      render(<DocumentDetailFlyout {...defaultSpanProps} />);

      const flyout = screen.getByTestId('waterfallFlyout');
      expect(flyout).toHaveAttribute('data-loading', 'false');
      expect(flyout).toHaveAttribute('data-title', 'Span document');
      expect(flyout).toHaveAttribute('data-has-hit', 'true');
    });

    it('should pass correct props to WaterfallFlyout for log type', () => {
      mockUseDocumentFlyoutData.mockReturnValue({
        type: 'logsFlyout',
        hit: mockLogHit,
        loading: false,
        title: 'Log document',
        logDataView: dataViewMock,
        error: null,
      });

      render(<DocumentDetailFlyout {...defaultLogProps} />);

      const flyout = screen.getByTestId('waterfallFlyout');
      expect(flyout).toHaveAttribute('data-loading', 'false');
      expect(flyout).toHaveAttribute('data-title', 'Log document');
      expect(flyout).toHaveAttribute('data-has-hit', 'true');
    });
  });

  describe('loading states', () => {
    it('should show loading state when data is loading', () => {
      mockUseDocumentFlyoutData.mockReturnValue({
        type: 'spanDetailFlyout',
        hit: null,
        loading: true,
        title: 'Span document',
        logDataView: null,
        error: null,
      });

      render(<DocumentDetailFlyout {...defaultSpanProps} />);

      const flyout = screen.getByTestId('waterfallFlyout');
      expect(flyout).toHaveAttribute('data-loading', 'true');
      expect(screen.getByTestId('loadingSkeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('spanFlyoutContent')).not.toBeInTheDocument();
    });

    it('should not render content when hit is null (even if not loading)', () => {
      mockUseDocumentFlyoutData.mockReturnValue({
        type: 'spanDetailFlyout',
        hit: null,
        loading: false,
        title: 'Span document',
        logDataView: null,
        error: null,
      });

      render(<DocumentDetailFlyout {...defaultSpanProps} />);

      expect(screen.queryByTestId('spanFlyoutContent')).not.toBeInTheDocument();
    });
  });

  describe('log flyout edge cases', () => {
    it('should render EuiCallOut when data has error', () => {
      mockUseDocumentFlyoutData.mockReturnValue({
        type: 'logsFlyout',
        hit: mockLogHit,
        loading: false,
        title: 'Log document',
        logDataView: dataViewMock,
        error: 'Failed to load data view',
      });

      render(<DocumentDetailFlyout {...defaultLogProps} />);

      expect(screen.getByText('Failed to load data view')).toBeInTheDocument();
      expect(screen.getByTestId('logFlyoutContent')).toBeInTheDocument();
    });

    it('should not render LogFlyoutContent when logDataView is null', () => {
      mockUseDocumentFlyoutData.mockReturnValue({
        type: 'logsFlyout',
        hit: mockLogHit,
        loading: false,
        title: 'Log document',
        logDataView: null,
        error: null,
      });

      render(<DocumentDetailFlyout {...defaultLogProps} />);

      expect(screen.queryByTestId('logFlyoutContent')).not.toBeInTheDocument();
    });
  });

  describe('switching between types', () => {
    it('should correctly switch from span to log type', () => {
      mockUseDocumentFlyoutData
        .mockReturnValueOnce({
          type: 'spanDetailFlyout',
          hit: mockSpanHit,
          loading: false,
          title: 'Span document',
          logDataView: null,
          error: null,
        })
        .mockReturnValueOnce({
          type: 'logsFlyout',
          hit: mockLogHit,
          loading: false,
          title: 'Log document',
          logDataView: dataViewMock,
          error: null,
        });

      const { rerender } = render(<DocumentDetailFlyout {...defaultSpanProps} />);

      expect(screen.getByTestId('spanFlyoutContent')).toBeInTheDocument();
      expect(screen.queryByTestId('logFlyoutContent')).not.toBeInTheDocument();

      rerender(<DocumentDetailFlyout {...defaultLogProps} />);

      expect(screen.queryByTestId('spanFlyoutContent')).not.toBeInTheDocument();
      expect(screen.getByTestId('logFlyoutContent')).toBeInTheDocument();
    });
  });
});
