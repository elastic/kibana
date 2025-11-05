/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { getColumns } from './get_columns';
import type { ErrorsByTraceId } from '@kbn/apm-types';

// Mock the i18n module
jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: jest.fn((key, options) => options?.defaultMessage || key),
  },
}));

describe('getColumns', () => {
  const mockGenerateDiscoverLink = jest.fn();
  const traceId = 'trace-123';
  const docId = 'span-456';
  const errorId = 'error-789';

  const mockErrorItem: ErrorsByTraceId['traceErrors'][0] = {
    error: {
      id: errorId,
      exception: {
        type: 'Error',
        message: 'Test error message',
      },
      grouping_key: 'group-123',
    },
    timestamp: { us: 1234567890 },
  };

  const mockErrorItemWithLog: ErrorsByTraceId['traceErrors'][0] = {
    error: {
      id: errorId,
      log: {
        message: 'Test log message',
      },
      culprit: 'test-culprit',
    },
    timestamp: { us: 1234567890 },
  };

  const mockUnprocessedOtelErrorItem: ErrorsByTraceId['traceErrors'][0] = {
    error: {
      id: errorId,
      exception: {
        type: 'Error',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDiscoverLink functionality', () => {
    it('should call generateDiscoverLink with correct parameters for APM source', () => {
      const source = 'apm';
      const columns = getColumns({
        generateDiscoverLink: mockGenerateDiscoverLink,
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      render(<>{ErrorRender?.(null, mockErrorItem)}</>);

      expect(mockGenerateDiscoverLink).toHaveBeenCalledWith({
        'trace.id': traceId,
        'span.id': docId,
        'processor.event': 'error',
        'error.id': errorId,
      });
    });

    it('should call generateDiscoverLink with correct parameters for OTEL processed source', () => {
      const source = 'unprocessedOtel';
      const columns = getColumns({
        generateDiscoverLink: mockGenerateDiscoverLink,
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      render(<>{ErrorRender?.(null, mockErrorItem)}</>);

      expect(mockGenerateDiscoverLink).toHaveBeenCalledWith({
        'trace.id': traceId,
        'span.id': docId,
        'event.name': undefined,
        'exception.message': 'Test error message',
      });
    });

    it('should call generateDiscoverLink with only traceId and docId for unknown source', () => {
      const source = 'unknown';
      const columns = getColumns({
        generateDiscoverLink: mockGenerateDiscoverLink,
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      render(<>{ErrorRender?.(null, mockErrorItem)}</>);

      expect(mockGenerateDiscoverLink).toHaveBeenCalledWith({
        'trace.id': traceId,
        'span.id': docId,
      });
    });

    it('should not include SPAN_ID when docId is not provided', () => {
      const source = 'apm';
      const columns = getColumns({
        generateDiscoverLink: mockGenerateDiscoverLink,
        traceId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      render(<>{ErrorRender?.(null, mockErrorItem)}</>);

      expect(mockGenerateDiscoverLink).toHaveBeenCalledWith({
        'trace.id': traceId,
        'processor.event': 'error',
        'error.id': errorId,
      });
    });

    it('should render link when generateDiscoverLink returns URL', () => {
      mockGenerateDiscoverLink.mockReturnValue('/discover/error-link');
      const source = 'apm';
      const columns = getColumns({
        generateDiscoverLink: mockGenerateDiscoverLink,
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      const { getByTestId } = render(<>{ErrorRender?.(null, mockErrorItem)}</>);

      expect(getByTestId('error-group-link')).toHaveAttribute('href', '/discover/error-link');
    });

    it('should render plain text when generateDiscoverLink returns undefined', () => {
      mockGenerateDiscoverLink.mockReturnValue(undefined);
      const source = 'apm';
      const columns = getColumns({
        generateDiscoverLink: mockGenerateDiscoverLink,
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      const { queryByTestId, getByTestId } = render(<>{ErrorRender?.(null, mockErrorItem)}</>);

      expect(queryByTestId('error-group-link')).not.toBeInTheDocument();
      expect(getByTestId('error-exception-message')).toBeInTheDocument();
    });
  });

  describe('exception message handling', () => {
    it('should render error message from exception when available', () => {
      mockGenerateDiscoverLink.mockReturnValue('/discover/error-link');
      const source = 'apm';
      const columns = getColumns({
        generateDiscoverLink: mockGenerateDiscoverLink,
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      const { getByTestId } = render(<>{ErrorRender?.(null, mockErrorItem)}</>);

      expect(getByTestId('error-exception-message')).toHaveTextContent('Test error message');
    });

    it('should render error message from log when exception message is not available', () => {
      mockGenerateDiscoverLink.mockReturnValue('/discover/error-link');
      const source = 'apm';
      const columns = getColumns({
        generateDiscoverLink: mockGenerateDiscoverLink,
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      const { getByTestId } = render(<>{ErrorRender?.(null, mockErrorItemWithLog)}</>);

      expect(getByTestId('error-exception-message')).toHaveTextContent('Test log message');
    });

    it('should render N/A when no error message is available', () => {
      mockGenerateDiscoverLink.mockReturnValue('/discover/error-link');
      const source = 'apm';
      const columns = getColumns({
        generateDiscoverLink: mockGenerateDiscoverLink,
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      const { getByTestId } = render(<>{ErrorRender?.(null, mockUnprocessedOtelErrorItem)}</>);

      expect(getByTestId('error-exception-message')).toHaveTextContent('N/A');
    });
  });

  describe('culprit handling', () => {
    it('should render culprit when available', () => {
      mockGenerateDiscoverLink.mockReturnValue('/discover/error-link');
      const source = 'apm';
      const columns = getColumns({
        generateDiscoverLink: mockGenerateDiscoverLink,
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      const { getByTestId } = render(<>{ErrorRender?.(null, mockErrorItemWithLog)}</>);

      expect(getByTestId('error-culprit')).toHaveTextContent('test-culprit');
    });

    it('should render N/A for culprit when not available', () => {
      mockGenerateDiscoverLink.mockReturnValue('/discover/error-link');
      const source = 'apm';
      const columns = getColumns({
        generateDiscoverLink: mockGenerateDiscoverLink,
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      const { getByTestId } = render(<>{ErrorRender?.(null, mockUnprocessedOtelErrorItem)}</>);

      expect(getByTestId('error-culprit')).toHaveTextContent('N/A');
    });
  });
});
