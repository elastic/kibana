/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createEvent, fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { getColumns } from './get_columns';
import type { ErrorsByTraceId } from '@kbn/apm-types';
import { useDiscoverLinkAndEsqlQuery } from '../../../../../hooks/use_discover_link_and_esql_query';
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import { useDocViewerExtensionActionsContext } from '../../../../../hooks/use_doc_viewer_extension_actions';

// Mock the i18n module
jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: jest.fn((key, options) => options?.defaultMessage || key),
  },
}));

jest.mock('../../../../../hooks/use_discover_link_and_esql_query', () => ({
  useDiscoverLinkAndEsqlQuery: jest.fn(),
}));

jest.mock('../../../../../hooks/use_data_sources', () => ({
  useDataSourcesContext: jest.fn(),
}));

jest.mock('../../../../../hooks/use_doc_viewer_extension_actions', () => ({
  useDocViewerExtensionActionsContext: jest.fn(),
}));

describe('getColumns', () => {
  const traceId = 'trace-123';
  const docId = 'span-456';
  const errorId = 'error-789';

  const mockErrorItem = {
    error: {
      id: errorId,
      exception: {
        type: 'Error',
        message: 'Test error message',
      },
      grouping_key: 'group-123',
    },
    timestamp: { us: 1234567890 },
  } as unknown as ErrorsByTraceId['traceErrors'][0];

  const mockErrorItemWithLog = {
    error: {
      id: errorId,
      log: {
        message: 'Test log message',
      },
      culprit: 'test-culprit',
    },
    timestamp: { us: 1234567890 },
  } as unknown as ErrorsByTraceId['traceErrors'][0];

  const mockUnprocessedOtelErrorItem = {
    error: {
      id: errorId,
      exception: {
        type: 'Error',
      },
    },
  } as unknown as ErrorsByTraceId['traceErrors'][0];

  beforeEach(() => {
    jest.clearAllMocks();
    (useDataSourcesContext as jest.Mock).mockReturnValue({
      indexes: { apm: { errors: 'apm-errors-*' } },
    });
    (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue(undefined);
    (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
      discoverUrl: '/app/discover#/?_a=1',
      esqlQueryString: 'FROM apm-errors-* | WHERE true',
    });
  });

  it('renders an EuiLink when useDiscoverLinkAndEsqlQuery returns a discoverUrl', () => {
    const source = 'apm';
    const columns = getColumns({
      traceId,
      docId,
      source,
    }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

    const ErrorRender = columns[0].render;
    const { getByTestId } = render(<>{ErrorRender?.(null, mockErrorItem)}</>);

    expect(getByTestId('error-group-link')).toHaveAttribute('href', '/app/discover#/?_a=1');
  });

  it('renders plain text when both discoverUrl and openInNewTab are unavailable', () => {
    (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
      discoverUrl: undefined,
      esqlQueryString: undefined,
    });
    (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue(undefined);

    const source = 'apm';
    const columns = getColumns({
      traceId,
      docId,
      source,
    }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

    const ErrorRender = columns[0].render;
    const { queryByTestId, getByTestId } = render(<>{ErrorRender?.(null, mockErrorItem)}</>);

    expect(queryByTestId('error-group-link')).not.toBeInTheDocument();
    expect(getByTestId('error-exception-message')).toBeInTheDocument();
  });

  it('calls openInNewTab on plain left click when esqlQueryString is available', () => {
    const openInNewTab = jest.fn();
    (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue({ openInNewTab });
    (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
      discoverUrl: '/app/discover#/?_a=1',
      esqlQueryString: 'FROM apm-errors-* | WHERE trace.id == "trace-123"',
    });

    const source = 'apm';
    const columns = getColumns({
      traceId,
      docId,
      source,
    }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

    const ErrorRender = columns[0].render;
    const { getByTestId } = render(<>{ErrorRender?.(null, mockErrorItem)}</>);

    const link = getByTestId('error-group-link');
    const clickEvent = createEvent.click(link, { button: 0 });
    fireEvent(link, clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(openInNewTab).toHaveBeenCalledWith({
      query: { esql: 'FROM apm-errors-* | WHERE trace.id == "trace-123"' },
      tabLabel: 'Test error message',
    });
  });

  it('does not intercept modifier click when href is present', () => {
    const openInNewTab = jest.fn();
    (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue({ openInNewTab });
    (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
      discoverUrl: '/app/discover#/?_a=1',
      esqlQueryString: 'FROM apm-errors-* | WHERE trace.id == "trace-123"',
    });

    const source = 'apm';
    const columns = getColumns({
      traceId,
      docId,
      source,
    }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

    const ErrorRender = columns[0].render;
    const { getByTestId } = render(<>{ErrorRender?.(null, mockErrorItem)}</>);

    const link = getByTestId('error-group-link');
    const ctrlClickEvent = createEvent.click(link, { button: 0, ctrlKey: true });
    fireEvent(link, ctrlClickEvent);

    expect(openInNewTab).not.toHaveBeenCalled();
    expect(ctrlClickEvent.defaultPrevented).toBe(false);
  });

  describe('exception message handling', () => {
    it('should render error message from exception when available', () => {
      const source = 'apm';
      const columns = getColumns({
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      const { getByTestId } = render(<>{ErrorRender?.(null, mockErrorItem)}</>);

      expect(getByTestId('error-exception-message')).toHaveTextContent('Test error message');
    });

    it('should render error message from log when exception message is not available', () => {
      const source = 'apm';
      const columns = getColumns({
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      const { getByTestId } = render(<>{ErrorRender?.(null, mockErrorItemWithLog)}</>);

      expect(getByTestId('error-exception-message')).toHaveTextContent('Test log message');
    });

    it('should render N/A when no error message is available', () => {
      const source = 'apm';
      const columns = getColumns({
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
      const source = 'apm';
      const columns = getColumns({
        traceId,
        docId,
        source,
      }) as Array<EuiTableFieldDataColumnType<ErrorsByTraceId['traceErrors'][0]>>;

      const ErrorRender = columns[0].render;
      const { getByTestId } = render(<>{ErrorRender?.(null, mockErrorItemWithLog)}</>);

      expect(getByTestId('error-culprit')).toHaveTextContent('test-culprit');
    });

    it('should render N/A for culprit when not available', () => {
      const source = 'apm';
      const columns = getColumns({
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
