/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useDocumentFlyoutData, type DocumentType } from './use_document_flyout_data';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';

const mockSpanHit = buildDataTableRecord(
  {
    _id: 'span-id',
    _index: 'traces-apm-*',
    _source: { 'span.id': 'span-id', 'span.name': 'test-span' },
  },
  dataViewMock
);

const mockLogHit = buildDataTableRecord(
  {
    _id: 'log-id',
    _index: 'logs-*',
    _source: { message: 'test log' },
  },
  dataViewMock
);

const mockUseSpanFlyoutData = jest.fn();
const mockUseLogFlyoutData = jest.fn();

jest.mock('./span_flyout', () => ({
  spanFlyoutId: 'spanDetailFlyout',
  useSpanFlyoutData: (params: any) => mockUseSpanFlyoutData(params),
}));

jest.mock('./logs_flyout', () => ({
  logsFlyoutId: 'logsFlyout',
  useLogFlyoutData: (params: any) => mockUseLogFlyoutData(params),
}));

describe('useDocumentFlyoutData', () => {
  const traceId = 'test-trace-id';
  const docId = 'test-doc-id';
  const docIndex = 'logs-*';

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSpanFlyoutData.mockReturnValue({
      hit: null,
      loading: false,
      title: 'Span document',
      error: null,
    });

    mockUseLogFlyoutData.mockReturnValue({
      hit: null,
      loading: false,
      title: 'Log document',
      logDataView: null,
      error: null,
    });
  });

  describe('span type', () => {
    it('should call useSpanFlyoutData with docId and useLogFlyoutData with empty id', () => {
      renderHook(() => useDocumentFlyoutData({ type: 'spanDetailFlyout', docId, traceId }));

      expect(mockUseSpanFlyoutData).toHaveBeenCalledWith({ spanId: docId, traceId });
      expect(mockUseLogFlyoutData).toHaveBeenCalledWith({ id: '', index: undefined });
    });

    it('should return span data when type is span', () => {
      mockUseSpanFlyoutData.mockReturnValue({
        hit: mockSpanHit,
        loading: false,
        title: 'Span document',
        error: null,
      });

      const { result } = renderHook(() =>
        useDocumentFlyoutData({ type: 'spanDetailFlyout', docId, traceId })
      );

      expect(result.current.type).toBe('spanDetailFlyout');
      expect(result.current.hit).toBe(mockSpanHit);
      expect(result.current.title).toBe('Span document');
    });

    it('should return loading true when span is loading', () => {
      mockUseSpanFlyoutData.mockReturnValue({
        hit: null,
        loading: true,
        title: 'Span document',
        error: null,
      });

      const { result } = renderHook(() =>
        useDocumentFlyoutData({ type: 'spanDetailFlyout', docId, traceId })
      );

      expect(result.current.loading).toBe(true);
    });

    it('should not include log-specific fields for span type', () => {
      mockUseSpanFlyoutData.mockReturnValue({
        hit: mockSpanHit,
        loading: false,
        title: 'Span document',
        error: null,
      });

      const { result } = renderHook(() =>
        useDocumentFlyoutData({ type: 'spanDetailFlyout', docId, traceId })
      );

      expect(result.current).not.toHaveProperty('logDataView');
    });

    it('should return error from span data', () => {
      const errorMessage = 'Failed to fetch span';
      mockUseSpanFlyoutData.mockReturnValue({
        hit: null,
        loading: false,
        title: 'Span document',
        error: errorMessage,
      });

      const { result } = renderHook(() =>
        useDocumentFlyoutData({ type: 'spanDetailFlyout', docId, traceId })
      );

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('log type', () => {
    it('should call useLogFlyoutData with docId and useSpanFlyoutData with empty spanId', () => {
      renderHook(() => useDocumentFlyoutData({ type: 'logsFlyout', docId, traceId, docIndex }));

      expect(mockUseSpanFlyoutData).toHaveBeenCalledWith({ spanId: '', traceId });
      expect(mockUseLogFlyoutData).toHaveBeenCalledWith({ id: docId, index: docIndex });
    });

    it('should return log data when type is log', () => {
      mockUseLogFlyoutData.mockReturnValue({
        hit: mockLogHit,
        loading: false,
        title: 'Log document',
        logDataView: dataViewMock,
        error: null,
      });

      const { result } = renderHook(() =>
        useDocumentFlyoutData({ type: 'logsFlyout', docId, traceId })
      );

      expect(result.current.type).toBe('logsFlyout');
      expect(result.current.hit).toBe(mockLogHit);
      expect(result.current.title).toBe('Log document');
      expect(result.current.logDataView).toBe(dataViewMock);
    });

    it('should return loading true when log is loading', () => {
      mockUseLogFlyoutData.mockReturnValue({
        hit: null,
        loading: true,
        title: 'Log document',
        logDataView: null,
        error: null,
      });

      const { result } = renderHook(() =>
        useDocumentFlyoutData({ type: 'logsFlyout', docId, traceId })
      );

      expect(result.current.loading).toBe(true);
    });

    it('should return error from log data', () => {
      const errorMessage = 'Failed to create data view';
      mockUseLogFlyoutData.mockReturnValue({
        hit: mockLogHit,
        loading: false,
        title: 'Log document',
        logDataView: null,
        error: errorMessage,
      });

      const { result } = renderHook(() =>
        useDocumentFlyoutData({ type: 'logsFlyout', docId, traceId })
      );

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('type switching', () => {
    it('should update data when type changes', () => {
      mockUseSpanFlyoutData.mockReturnValue({
        hit: mockSpanHit,
        loading: false,
        title: 'Span document',
        error: null,
      });

      mockUseLogFlyoutData.mockReturnValue({
        hit: mockLogHit,
        loading: false,
        title: 'Log document',
        logDataView: dataViewMock,
        error: null,
      });

      const { result, rerender } = renderHook(
        ({ type }: { type: DocumentType }) => useDocumentFlyoutData({ type, docId, traceId }),
        { initialProps: { type: 'spanDetailFlyout' as DocumentType } }
      );

      expect(result.current.type).toBe('spanDetailFlyout');
      expect(result.current.hit).toBe(mockSpanHit);

      rerender({ type: 'logsFlyout' });

      expect(result.current.type).toBe('logsFlyout');
      expect(result.current.hit).toBe(mockLogHit);
    });
  });
});
