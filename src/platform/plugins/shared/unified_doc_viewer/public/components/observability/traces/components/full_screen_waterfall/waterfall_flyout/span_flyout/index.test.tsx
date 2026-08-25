/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SpanFlyoutContent, type SpanFlyoutContentProps } from '.';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';

const mockOpenAndScrollToSection = jest.fn();

jest.mock('../../../../doc_viewer_overview/overview', () => {
  const ReactMock = jest.requireActual('react');

  const stableApi = {
    openAndScrollToSection: (section: string) => mockOpenAndScrollToSection(section),
  };

  return {
    Overview: ReactMock.forwardRef(
      ({ hit, indexes, showWaterfall, showActions, dataView }: any, ref: any) => {
        ReactMock.useImperativeHandle(ref, () => stableApi, []);

        return (
          <div
            data-test-subj="overviewComponent"
            data-hit-id={hit?.id}
            data-show-waterfall={showWaterfall}
            data-show-actions={showActions}
          >
            Overview Mock
          </div>
        );
      }
    ),
  };
});

const mockIndexes = {
  traces: 'traces-*',
  logs: 'logs-*',
};

jest.mock('../../../../../../../hooks/use_data_sources', () => ({
  useDataSourcesContext: () => ({
    indexes: mockIndexes,
  }),
}));

describe('SpanFlyoutContent', () => {
  const mockHit = buildDataTableRecord(
    {
      _id: 'test-span-id',
      _index: 'traces-apm-default',
      _source: {
        '@timestamp': '2023-01-01T00:00:00.000Z',
        'span.name': 'test-span',
        'span.id': 'test-span-id',
        'trace.id': 'test-trace-id',
      },
    },
    dataViewMock
  );

  const defaultProps: SpanFlyoutContentProps = {
    hit: mockHit,
    dataView: dataViewMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAndScrollToSection.mockClear();
  });

  it('should render Overview component with correct props', () => {
    render(<SpanFlyoutContent {...defaultProps} />);

    const overview = screen.getByTestId('overviewComponent');
    expect(overview).toBeInTheDocument();
    expect(overview).toHaveAttribute('data-hit-id', mockHit.id);
    expect(overview).toHaveAttribute('data-show-waterfall', 'false');
    expect(overview).toHaveAttribute('data-show-actions', 'false');
  });

  it('should render with different hit data', () => {
    const differentHit = buildDataTableRecord(
      {
        _id: 'different-span-id',
        _index: 'traces-apm-default',
        _source: {
          '@timestamp': '2023-01-02T00:00:00.000Z',
          'span.name': 'different-span',
        },
      },
      dataViewMock
    );

    render(<SpanFlyoutContent {...defaultProps} hit={differentHit} />);

    const overview = screen.getByTestId('overviewComponent');
    expect(overview).toHaveAttribute('data-hit-id', differentHit.id);
  });

  describe('activeSection behavior', () => {
    it('should call openAndScrollToSection when activeSection is provided', async () => {
      render(<SpanFlyoutContent {...defaultProps} activeSection="errors-table" />);

      await waitFor(() => {
        expect(mockOpenAndScrollToSection).toHaveBeenCalledWith('errors-table');
      });
    });

    it('should not call openAndScrollToSection when activeSection is undefined', () => {
      render(<SpanFlyoutContent {...defaultProps} />);

      expect(mockOpenAndScrollToSection).not.toHaveBeenCalled();
    });
  });
});
