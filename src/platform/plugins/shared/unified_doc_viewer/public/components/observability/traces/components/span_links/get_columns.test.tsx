/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { getColumns } from './get_columns';
import { createEvent, fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { SpanLinkDetails } from '@kbn/apm-types';
import { useDiscoverLinkAndEsqlQuery } from '../../../../../hooks/use_discover_link_and_esql_query';
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import { useDocViewerExtensionActionsContext } from '../../../../../hooks/use_doc_viewer_extension_actions';

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
  const type = 'incoming';
  const columns = getColumns({ type }) as Array<EuiTableFieldDataColumnType<SpanLinkDetails>>;

  const item = {
    spanId: 'span123',
    traceId: 'trace456',
    details: {
      spanName: 'mySpan',
      transactionId: 'transaction999',
      duration: 1234,
      serviceName: 'myService',
      agentName: 'java',
    },
  } as SpanLinkDetails;

  beforeEach(() => {
    jest.clearAllMocks();
    (useDataSourcesContext as jest.Mock).mockReturnValue({
      indexes: { apm: { traces: 'apm-traces-*' } },
    });
    (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue(undefined);
    (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
      discoverUrl: undefined,
      esqlQueryString: undefined,
    });
  });

  describe('span name link', () => {
    it('renders with link', () => {
      (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
        discoverUrl: '/discover/transaction/transaction999',
        esqlQueryString: 'ESQL_TRANSACTION',
      });

      const SpanRender = columns[0].render;
      const { getByTestId } = render(<>{SpanRender?.(null, item)}</>);
      expect(getByTestId('incoming-spanNameLink-span123')).toHaveAttribute(
        'href',
        '/discover/transaction/transaction999'
      );
      expect(getByTestId('incoming-spanName-span123')).toHaveTextContent('mySpan');
      expect(useDiscoverLinkAndEsqlQuery).toHaveBeenCalledWith(
        expect.objectContaining({ indexPattern: 'apm-traces-*', whereClause: expect.any(Function) })
      );
    });

    it('renders plain text when both discoverUrl and openInNewTab are unavailable', () => {
      (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
        discoverUrl: undefined,
        esqlQueryString: undefined,
      });
      (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue(undefined);

      const SpanRender = columns[0].render;
      const { getByText, queryByTestId } = render(<>{SpanRender?.(null, item)}</>);
      expect(queryByTestId('incoming-spanNameLink-span123')).not.toBeInTheDocument();
      expect(getByText('mySpan')).toBeInTheDocument();
    });

    it('calls openInNewTab on plain left click', () => {
      const openInNewTab = jest.fn();
      (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue({ openInNewTab });
      (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
        discoverUrl: '/discover/transaction/transaction999',
        esqlQueryString: 'ESQL_TRANSACTION',
      });

      const SpanRender = columns[0].render;
      const { getByTestId } = render(<>{SpanRender?.(null, item)}</>);

      const link = getByTestId('incoming-spanNameLink-span123');
      const clickEvent = createEvent.click(link, { button: 0 });
      fireEvent(link, clickEvent);

      expect(clickEvent.defaultPrevented).toBe(true);
      expect(openInNewTab).toHaveBeenCalledWith({
        query: { esql: 'ESQL_TRANSACTION' },
        tabLabel: 'mySpan',
      });
    });
  });

  describe('service name link', () => {
    it('renders with link', () => {
      (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
        discoverUrl: '/discover/service/myService',
        esqlQueryString: 'ESQL_SERVICE',
      });

      const ServiceNameRender = columns[2].render;
      const { getByTestId } = render(<>{ServiceNameRender?.(null, item)}</>);
      expect(getByTestId('incoming-serviceNameLink-myService')).toHaveAttribute(
        'href',
        '/discover/service/myService'
      );
      expect(getByTestId('incoming-serviceName-myService')).toHaveTextContent('myService');
      expect(useDiscoverLinkAndEsqlQuery).toHaveBeenCalledWith(
        expect.objectContaining({ indexPattern: 'apm-traces-*', whereClause: expect.any(Function) })
      );
    });

    it('renders plain text when both discoverUrl and openInNewTab are unavailable', () => {
      (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
        discoverUrl: undefined,
        esqlQueryString: undefined,
      });
      (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue(undefined);

      const ServiceNameRender = columns[2].render;
      const { getByText, queryByTestId } = render(<>{ServiceNameRender?.(null, item)}</>);
      expect(queryByTestId('incoming-serviceNameLink-myService')).not.toBeInTheDocument();
      expect(getByText('myService')).toBeInTheDocument();
    });

    it('calls openInNewTab on plain left click', () => {
      const openInNewTab = jest.fn();
      (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue({ openInNewTab });
      (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
        discoverUrl: '/discover/service/myService',
        esqlQueryString: 'ESQL_SERVICE',
      });

      const ServiceNameRender = columns[2].render;
      const { getByTestId } = render(<>{ServiceNameRender?.(null, item)}</>);

      const link = getByTestId('incoming-serviceNameLink-myService');
      const clickEvent = createEvent.click(link, { button: 0 });
      fireEvent(link, clickEvent);

      expect(clickEvent.defaultPrevented).toBe(true);
      expect(openInNewTab).toHaveBeenCalledWith({
        query: { esql: 'ESQL_SERVICE' },
        tabLabel: 'myService',
      });
    });
  });

  describe('trace id link', () => {
    it('renders with link', () => {
      (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
        discoverUrl: '/discover/trace/trace456',
        esqlQueryString: 'ESQL_TRACE',
      });

      const TraceIdRender = columns[3].render;
      const { getByTestId } = render(<>{TraceIdRender?.(null, item)}</>);
      expect(getByTestId('incoming-traceIdLink-trace456')).toHaveAttribute(
        'href',
        '/discover/trace/trace456'
      );
      expect(getByTestId('incoming-traceId-trace456')).toHaveTextContent('trace456');
      expect(useDiscoverLinkAndEsqlQuery).toHaveBeenCalledWith(
        expect.objectContaining({ indexPattern: 'apm-traces-*', whereClause: expect.any(Function) })
      );
    });

    it('renders plain text when both discoverUrl and openInNewTab are unavailable', () => {
      (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
        discoverUrl: undefined,
        esqlQueryString: undefined,
      });
      (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue(undefined);

      const TraceIdRender = columns[3].render;
      const { getByText, queryByTestId } = render(<>{TraceIdRender?.(null, item)}</>);
      expect(queryByTestId('incoming-traceIdLink-trace456')).not.toBeInTheDocument();
      expect(getByText('trace456')).toBeInTheDocument();
    });

    it('calls openInNewTab on plain left click', () => {
      const openInNewTab = jest.fn();
      (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue({ openInNewTab });
      (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
        discoverUrl: '/discover/trace/trace456',
        esqlQueryString: 'ESQL_TRACE',
      });

      const TraceIdRender = columns[3].render;
      const { getByTestId } = render(<>{TraceIdRender?.(null, item)}</>);

      const link = getByTestId('incoming-traceIdLink-trace456');
      const clickEvent = createEvent.click(link, { button: 0 });
      fireEvent(link, clickEvent);

      expect(clickEvent.defaultPrevented).toBe(true);
      expect(openInNewTab).toHaveBeenCalledWith({
        query: { esql: 'ESQL_TRACE' },
        tabLabel: 'trace456',
      });
    });

    it('does not intercept modifier clicks when href is present', () => {
      const openInNewTab = jest.fn();
      (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue({ openInNewTab });
      (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
        discoverUrl: '/discover/trace/trace456',
        esqlQueryString: 'ESQL_TRACE',
      });

      const TraceIdRender = columns[3].render;
      const { getByTestId } = render(<>{TraceIdRender?.(null, item)}</>);

      const link = getByTestId('incoming-traceIdLink-trace456');
      const ctrlClickEvent = createEvent.click(link, { button: 0, ctrlKey: true });
      fireEvent(link, ctrlClickEvent);

      expect(openInNewTab).not.toHaveBeenCalled();
      expect(ctrlClickEvent.defaultPrevented).toBe(false);
    });
  });

  describe('fallback rendering', () => {
    it('renders N/A when details are missing', () => {
      const itemMissingDetails = { spanId: 'spanX', traceId: 'traceY', details: undefined };
      const ServiceNameRender = columns[2].render;
      const { getByTestId } = render(<>{ServiceNameRender?.(null, itemMissingDetails)}</>);
      expect(getByTestId('incoming-serviceName-N/A')).toHaveTextContent('N/A');
    });
  });
});
