/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import { type SpanLinks as SpanLinksType } from '@kbn/apm-types';
import { render } from '@testing-library/react';
import React from 'react';
import { SpanLinks, getIncomingSpanLinksESQL, getOutgoingSpanLinksESQL } from '.';
import { esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import {
  OTEL_LINKS_SPAN_ID,
  OTEL_LINKS_TRACE_ID,
  SPAN_LINKS_TRACE_ID,
  SPAN_LINKS_SPAN_ID,
} from '@kbn/discover-utils';
// Mock dependencies
vi.mock('../../../../../hooks/use_data_sources', () => {
  const mocked = {
    useDataSourcesContext: () => ({
      indexes: { apm: { traces: 'apm-traces-*' } },
    }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../../hooks/use_generate_discover_link', () => {
  const mocked = {
    useGetGenerateDiscoverLink: () => ({
      generateDiscoverLink: vi.fn(() => 'http://discover/link'),
    }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./get_columns', () => {
  const mocked = {
    getColumns: vi.fn(() => [{ field: 'duration', name: 'Duration' }]),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./use_fetch_span_links', () => {
  const mocked = {
    useFetchSpanLinks: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../content_framework/lazy_content_framework_section', () => {
  const mocked = {
    ContentFrameworkSection: ({ children, title, ...rest }: any) => (
      <div data-test-subj="ContentFrameworkSection" {...rest}>
        <h2>{title}</h2>
        {children}
      </div>
    ),
  };
  return { ...mocked, default: mocked };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockUseFetchSpanLinks = require('./use_fetch_span_links').useFetchSpanLinks;

describe('SpanLinks', () => {
  const defaultProps = { docId: 'doc1', traceId: 'trace1' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when loading', () => {
    mockUseFetchSpanLinks.mockReturnValue({
      loading: true,
      error: null,
      value: { incomingSpanLinks: [], outgoingSpanLinks: [] },
    });
    const { container } = render(<SpanLinks {...defaultProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when there are no links and no error', () => {
    mockUseFetchSpanLinks.mockReturnValue({
      loading: false,
      error: null,
      value: { incomingSpanLinks: [], outgoingSpanLinks: [] },
    });
    const { container } = render(<SpanLinks {...defaultProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders error message when error is present', () => {
    mockUseFetchSpanLinks.mockReturnValue({
      loading: false,
      error: new Error('BOOM'),
      value: { incomingSpanLinks: [], outgoingSpanLinks: [] },
    });
    const { getByTestId, getByText } = render(<SpanLinks {...defaultProps} />);
    expect(getByTestId('unifiedDocViewerSpanLinksFetchErrorCallout')).toBeInTheDocument();
    expect(getByText(/Couldn't load span links for this span/i)).toBeInTheDocument();
  });

  it('renders incoming links and table', () => {
    mockUseFetchSpanLinks.mockReturnValue({
      loading: false,
      error: null,
      value: {
        incomingSpanLinks: [
          {
            spanId: 'incomingSpan1',
            traceId: 'trace1',
            details: {
              duration: 100,
              agentName: 'nodejs',
              serviceName: 'service1',
              environment: 'foo',
            },
          },
        ],
        outgoingSpanLinks: [],
      } as SpanLinksType,
    });
    const { getByTestId } = render(<SpanLinks {...defaultProps} />);
    expect(getByTestId('unifiedDocViewerSpanLinksAccordion')).toBeInTheDocument();
    expect(getByTestId('unifiedDocViewerSpanLinkTypeSelect-incoming').textContent).toEqual(
      'Incoming links (1)'
    );
    expect(getByTestId('unifiedDocViewerSpanLinkTypeSelect-outgoing').textContent).toEqual(
      'Outgoing links (0)'
    );
  });

  it('switches to outgoing if incoming links are empty', () => {
    mockUseFetchSpanLinks.mockReturnValue({
      loading: false,
      error: null,
      value: {
        incomingSpanLinks: [],
        outgoingSpanLinks: [
          {
            spanId: 'outgoingSpan1',
            traceId: 'trace1',
            details: {
              duration: 100,
              agentName: 'nodejs',
              serviceName: 'service1',
              environment: 'foo',
            },
          },
        ],
      } as SpanLinksType,
    });
    const { getByTestId } = render(<SpanLinks {...defaultProps} />);
    expect(getByTestId('unifiedDocViewerSpanLinksAccordion')).toBeInTheDocument();
    expect(getByTestId('unifiedDocViewerSpanLinkTypeSelect-incoming').textContent).toEqual(
      'Incoming links (0)'
    );
    expect(getByTestId('unifiedDocViewerSpanLinkTypeSelect-outgoing').textContent).toEqual(
      'Outgoing links (1)'
    );
  });

  it('disables select options when there are no links for that type', () => {
    mockUseFetchSpanLinks.mockReturnValue({
      loading: false,
      error: null,
      value: {
        incomingSpanLinks: [],
        outgoingSpanLinks: [
          {
            spanId: 'outgoingSpan1',
            traceId: 'trace1',
            details: {
              duration: 100,
              agentName: 'nodejs',
              serviceName: 'service1',
              environment: 'foo',
            },
          },
        ],
      } as SpanLinksType,
    });
    const { getByTestId } = render(<SpanLinks {...defaultProps} />);
    const select = getByTestId('unifiedDocViewerSpanLinkTypeSelect');
    expect(
      select.querySelector('[data-test-subj="unifiedDocViewerSpanLinkTypeSelect-incoming"]')
    ).toBeDisabled();
    expect(
      select.querySelector('[data-test-subj="unifiedDocViewerSpanLinkTypeSelect-outgoing"]')
    ).not.toBeDisabled();
  });
});

const renderClause = (condition: ESQLAstExpression | undefined): string | undefined => {
  if (!condition) {
    return undefined;
  }
  const query = esql.from('apm-traces-*');
  query.where`${condition}`;
  return query.print('pipe-multiline');
};

describe('getOutgoingSpanLinksESQL', () => {
  it('builds an IN query for multiple links', () => {
    const spanLinks = [
      { traceId: 'trace1', spanId: 'span1' },
      { traceId: 'trace2', spanId: 'span2' },
    ];

    expect(renderClause(getOutgoingSpanLinksESQL(spanLinks))).toEqual(
      'FROM apm-traces-*\n  | WHERE (trace.id IN ("trace1", "trace2")) AND (span.id IN ("span1", "span2"))'
    );
  });

  it('builds an IN query for a single link', () => {
    const spanLinks = [{ traceId: 'traceX', spanId: 'spanX' }];

    expect(renderClause(getOutgoingSpanLinksESQL(spanLinks))).toEqual(
      'FROM apm-traces-*\n  | WHERE (trace.id IN ("traceX")) AND (span.id IN ("spanX"))'
    );
  });

  it('returns no clause when there are no links', () => {
    expect(getOutgoingSpanLinksESQL([])).toBeUndefined();
  });

  it('preserves backslash-then-letter sequences inside IN lists', () => {
    const spanLinks = [{ traceId: 'trace\\n1', spanId: 'span\\t1' }];

    expect(renderClause(getOutgoingSpanLinksESQL(spanLinks))).toEqual(
      'FROM apm-traces-*\n  | WHERE (trace.id IN ("trace\\\\n1")) AND (span.id IN ("span\\\\t1"))'
    );
  });
});

describe('getIncomingSpanLinksESQL', () => {
  it('builds a QSTR query', () => {
    expect(renderClause(getIncomingSpanLinksESQL('trace1', 'span1'))).toEqual(
      `FROM apm-traces-*\n  | WHERE QSTR("${OTEL_LINKS_TRACE_ID}:trace1 AND ${OTEL_LINKS_SPAN_ID}:span1") OR QSTR("${SPAN_LINKS_TRACE_ID}:trace1 AND ${SPAN_LINKS_SPAN_ID}:span1")`
    );
  });
});
