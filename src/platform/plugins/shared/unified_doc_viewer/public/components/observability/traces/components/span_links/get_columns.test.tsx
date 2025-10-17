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
import { render } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { SpanLinkDetails } from '@kbn/apm-types';
import { SERVICE_NAME_FIELD, SPAN_ID_FIELD, TRACE_ID_FIELD } from '@kbn/discover-utils';

describe('getColumns', () => {
  const generateDiscoverLink = jest.fn((params) => {
    if (params[SPAN_ID_FIELD]) return `/discover/span/${params[SPAN_ID_FIELD]}`;
    if (params[SERVICE_NAME_FIELD]) return `/discover/service/${params[SERVICE_NAME_FIELD]}`;
    if (params[TRACE_ID_FIELD]) return `/discover/trace/${params[TRACE_ID_FIELD]}`;
    return undefined;
  });

  const type = 'incoming';
  const columns = getColumns({ generateDiscoverLink, type }) as Array<
    EuiTableFieldDataColumnType<SpanLinkDetails>
  >;

  const item = {
    spanId: 'span123',
    traceId: 'trace456',
    details: {
      spanName: 'mySpan',
      duration: 1234,
      serviceName: 'myService',
      agentName: 'java',
    },
  } as SpanLinkDetails;

  it('renders span column with link', () => {
    const SpanRender = columns[0].render;
    const { getByTestId } = render(<>{SpanRender?.(null, item)}</>);
    expect(getByTestId('incoming-spanNameLink-span123')).toHaveAttribute(
      'href',
      '/discover/span/span123'
    );
    expect(getByTestId('incoming-spanName-span123')).toHaveTextContent('mySpan');
  });

  it('renders plain span name when generateDiscoverLink returns undefined', () => {
    const generateDiscoverLinkNone = jest.fn(() => undefined);
    const columnsNone = getColumns({
      generateDiscoverLink: generateDiscoverLinkNone,
      type,
    }) as Array<EuiTableFieldDataColumnType<SpanLinkDetails>>;
    const SpanRender = columnsNone[0].render;
    const { getByText, queryByTestId } = render(<>{SpanRender?.(null, item)}</>);
    expect(queryByTestId('incoming-spanNameLink-span123')).not.toBeInTheDocument();
    expect(getByText('mySpan')).toBeInTheDocument();
  });

  it('renders serviceName column with link', () => {
    const ServiceNameRender = columns[2].render;
    const { getByTestId } = render(<>{ServiceNameRender?.(null, item)}</>);
    expect(getByTestId('incoming-serviceNameLink-myService')).toHaveAttribute(
      'href',
      '/discover/service/myService'
    );
    expect(getByTestId('incoming-serviceName-myService')).toHaveTextContent('myService');
  });

  it('renders plain service name when generateDiscoverLink returns undefined', () => {
    const generateDiscoverLinkNone = jest.fn(() => undefined);
    const columnsNone = getColumns({
      generateDiscoverLink: generateDiscoverLinkNone,
      type,
    }) as Array<EuiTableFieldDataColumnType<SpanLinkDetails>>;
    const ServiceNameRender = columnsNone[2].render;
    const { getByText, queryByTestId } = render(<>{ServiceNameRender?.(null, item)}</>);
    expect(queryByTestId('incoming-serviceNameLink-myService')).not.toBeInTheDocument();
    expect(getByText('myService')).toBeInTheDocument();
  });

  it('renders traceId column with link', () => {
    const TraceIdRender = columns[3].render;
    const { getByTestId } = render(<>{TraceIdRender?.(null, item)}</>);
    expect(getByTestId('incoming-traceIdLink-trace456')).toHaveAttribute(
      'href',
      '/discover/trace/trace456'
    );
    expect(getByTestId('incoming-traceId-trace456')).toHaveTextContent('trace456');
  });

  it('renders plain trace id when generateDiscoverLink returns undefined', () => {
    const generateDiscoverLinkNone = jest.fn(() => undefined);
    const columnsNone = getColumns({
      generateDiscoverLink: generateDiscoverLinkNone,
      type,
    }) as Array<EuiTableFieldDataColumnType<SpanLinkDetails>>;
    const TraceIdRender = columnsNone[3].render;
    const { getByText, queryByTestId } = render(<>{TraceIdRender?.(null, item)}</>);
    expect(queryByTestId('incoming-traceIdLink-trace456')).not.toBeInTheDocument();
    expect(getByText('trace456')).toBeInTheDocument();
  });

  it('renders N/A when details are missing', () => {
    const itemMissingDetails = { spanId: 'spanX', traceId: 'traceY', details: undefined };
    const ServiceNameRender = columns[2].render;
    const { getByTestId } = render(<>{ServiceNameRender?.(null, itemMissingDetails)}</>);
    expect(getByTestId('incoming-serviceName-N/A')).toHaveTextContent('N/A');
  });
});
