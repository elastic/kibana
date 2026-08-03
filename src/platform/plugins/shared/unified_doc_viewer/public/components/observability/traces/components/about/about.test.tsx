/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, act, within } from '@testing-library/react';
import { buildDataViewMock, deepMockedFields } from '@kbn/discover-utils/src/__mocks__';
import { About } from '.';
import { buildHitMock } from '../../../../../__mocks__';
import { setUnifiedDocViewerServices } from '../../../../../plugin';
import { mockUnifiedDocViewerServices } from '../../../../../__mocks__';

const mockUseFetchTraceRootSpanContext = jest.fn();
jest.mock('../../doc_viewer_overview/hooks/use_fetch_trace_root_span', () => ({
  useFetchTraceRootSpanContext: () => mockUseFetchTraceRootSpanContext(),
}));

jest.mock('../../../../../hooks/use_doc_viewer_extension_actions', () => ({
  useDocViewerExtensionActionsContext: () => undefined,
}));

jest.mock('@kbn/apm-ui-shared', () => ({
  ...jest.requireActual('@kbn/apm-ui-shared'),
  Timestamp: () => <span>timestamp</span>,
  HttpStatusCode: ({ code }: { code: number }) => <span>{code}</span>,
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({
    euiTheme: {
      font: { weight: { semiBold: 700 } },
      border: { thin: '1px solid #ccc' },
      size: { xs: '12px' },
    },
  }),
  useEuiFontSize: () => ({ fontSize: '12px' }),
  euiFontSize: (_themeContext: unknown, size: string) => ({
    fontSize: size === 's' ? '12px' : '10px',
  }),
}));

const mockDataView = buildDataViewMock({ name: 'data-view-mock', fields: deepMockedFields });

const transactionHit = buildHitMock(
  {
    'transaction.name': ['checkout'],
    'transaction.duration.us': [50000],
  },
  'index',
  mockDataView
);

const defaultProps = {
  hit: transactionHit,
  dataView: mockDataView,
  filter: jest.fn(),
  onAddColumn: jest.fn(),
  onRemoveColumn: jest.fn(),
  columns: [] as string[],
};

describe('About', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchTraceRootSpanContext.mockReturnValue({
      span: undefined,
      loading: false,
      error: null,
    });
    setUnifiedDocViewerServices({
      ...mockUnifiedDocViewerServices,
      fieldsMetadata: {
        useFieldsMetadata: () => ({ fieldsMetadata: {} }),
      } as (typeof mockUnifiedDocViewerServices)['fieldsMetadata'],
    });
  });

  describe('duration percentage', () => {
    it('renders without percentage when root span has not loaded', () => {
      render(<About {...defaultProps} />);

      const grid = screen.getByTestId('UnifiedDocViewerTableGrid');
      expect(within(grid).queryByText(/\(50% of trace\)/)).not.toBeInTheDocument();
    });

    it('updates with percentage after root span loads', async () => {
      const { rerender } = render(<About {...defaultProps} />);

      const grid = screen.getByTestId('UnifiedDocViewerTableGrid');
      expect(within(grid).queryByText(/\(50% of trace\)/)).not.toBeInTheDocument();

      mockUseFetchTraceRootSpanContext.mockReturnValue({
        span: { duration: 100000 },
        loading: false,
        error: null,
      });

      await act(async () => {
        rerender(<About {...defaultProps} />);
      });

      expect(within(grid).getByText(/\(50% of trace\)/)).toBeInTheDocument();
    });
  });

  it('renders span fields for a span document', () => {
    const spanHit = buildHitMock(
      {
        'span.name': ['db.query'],
        'span.duration.us': [1000],
        'service.name': ['my-service'],
        'trace.id': ['abc123'],
        '@timestamp': [1234567890000],
      },
      'index',
      mockDataView
    );

    render(<About {...defaultProps} hit={spanHit} />);

    expect(screen.queryByText(/of trace/)).not.toBeInTheDocument();
  });
});
