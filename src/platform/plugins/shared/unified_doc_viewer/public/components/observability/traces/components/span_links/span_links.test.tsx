/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { SpanLinksComponent } from '.';
import { AbortableAsyncState } from '@kbn/react-hooks';
import { SpanLinks } from '@kbn/apm-types';

describe('SpanLinksComponent', () => {
  const incomingSpanLinks = [
    {
      details: {
        spanName: 'spanA',
        serviceName: 'serviceA',
        agentName: 'java',
        duration: 1000,
      },
      traceId: 'traceA',
      spanId: 'spanAId',
    },
  ];
  const outgoingSpanLinks = [
    {
      details: {
        spanName: 'spanB',
        serviceName: 'serviceB',
        agentName: 'python',
        duration: 2000,
      },
      traceId: 'traceB',
      spanId: 'spanBId',
    },
  ];

  it('renders null when loading', () => {
    const { container } = render(
      <SpanLinksComponent
        data={
          {
            loading: true,
            error: null,
            value: null,
          } as unknown as AbortableAsyncState<SpanLinks | null>
        }
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders error message', () => {
    const { getByText } = render(
      <SpanLinksComponent
        data={
          {
            loading: false,
            error: new Error('fail'),
            value: null,
          } as unknown as AbortableAsyncState<SpanLinks | null>
        }
      />
    );
    expect(getByText(/An error happened when trying to fetch data/i)).toBeInTheDocument();
  });

  it('renders null when there are no span links', () => {
    const { container } = render(
      <SpanLinksComponent
        data={
          {
            loading: false,
            error: null,
            value: { incomingSpanLinks: [], outgoingSpanLinks: [] },
          } as unknown as AbortableAsyncState<SpanLinks | null>
        }
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders incoming span links in the data grid', () => {
    const { getByTestId } = render(
      <SpanLinksComponent
        data={
          {
            loading: false,
            error: null,
            value: { incomingSpanLinks, outgoingSpanLinks: [] },
          } as unknown as AbortableAsyncState<SpanLinks | null>
        }
      />
    );
    expect(getByTestId('incoming-spanName-spanAId')).toBeInTheDocument();
    expect(getByTestId('spanLinkTypeSelect-incoming').textContent).toEqual('Incoming links (1)');
    expect(getByTestId('spanLinkTypeSelect-outgoing').textContent).toEqual('Outgoing links (0)');
  });

  it('renders outgoing span links when type is changed', () => {
    const { getByTestId } = render(
      <SpanLinksComponent
        data={
          {
            loading: false,
            error: null,
            value: { incomingSpanLinks, outgoingSpanLinks },
          } as unknown as AbortableAsyncState<SpanLinks | null>
        }
      />
    );

    fireEvent.change(getByTestId('spanLinkTypeSelect'), { target: { value: 'outgoing' } });
    expect(getByTestId('outgoing-spanName-spanBId')).toBeInTheDocument();
    expect(getByTestId('spanLinkTypeSelect-incoming').textContent).toEqual('Incoming links (1)');
    expect(getByTestId('spanLinkTypeSelect-outgoing').textContent).toEqual('Outgoing links (1)');
  });

  it('switches to outgoing type if incoming links are empty', () => {
    const { getByTestId } = render(
      <SpanLinksComponent
        data={
          {
            loading: false,
            error: null,
            value: { incomingSpanLinks: [], outgoingSpanLinks },
          } as unknown as AbortableAsyncState<SpanLinks | null>
        }
      />
    );
    expect(getByTestId('spanLinkTypeSelect')).toHaveValue('outgoing');
  });
});
