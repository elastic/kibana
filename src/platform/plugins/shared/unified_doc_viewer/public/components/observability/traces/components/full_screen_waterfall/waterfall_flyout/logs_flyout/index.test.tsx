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
import { LogFlyoutContent, type LogFlyoutContentProps } from '.';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';

jest.mock('../../../../../../doc_viewer_logs_overview', () => ({
  __esModule: true,
  default: ({ hit, dataView, indexes, showTraceWaterfall }: any) => (
    <div
      data-test-subj="logsOverviewComponent"
      data-hit-id={hit?.id}
      data-show-trace-waterfall={showTraceWaterfall}
      data-view-id={dataView?.id}
    >
      Logs Overview Mock
    </div>
  ),
}));

const mockIndexes = {
  traces: 'traces-*',
  logs: 'logs-*',
};

jest.mock('../../../../../../../hooks/use_data_sources', () => ({
  useDataSourcesContext: () => ({
    indexes: mockIndexes,
  }),
}));

describe('LogFlyoutContent', () => {
  const mockHit = buildDataTableRecord(
    {
      _id: 'test-log-id',
      _index: 'logs-default',
      _source: {
        '@timestamp': '2023-01-01T00:00:00.000Z',
        message: 'test log message',
      },
    },
    dataViewMock
  );

  const defaultProps: LogFlyoutContentProps = {
    hit: mockHit,
    logDataView: dataViewMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render LogsOverview component with correct props', () => {
    render(<LogFlyoutContent {...defaultProps} />);

    const logsOverview = screen.getByTestId('logsOverviewComponent');
    expect(logsOverview).toBeInTheDocument();
    expect(logsOverview).toHaveAttribute('data-hit-id', mockHit.id);
    expect(logsOverview).toHaveAttribute('data-show-trace-waterfall', 'false');
  });

  it('should render with different hit data', () => {
    const differentHit = buildDataTableRecord(
      {
        _id: 'different-log-id',
        _index: 'logs-other',
        _source: {
          '@timestamp': '2023-01-02T00:00:00.000Z',
          message: 'different log message',
        },
      },
      dataViewMock
    );

    render(<LogFlyoutContent {...defaultProps} hit={differentHit} />);

    const logsOverview = screen.getByTestId('logsOverviewComponent');
    expect(logsOverview).toHaveAttribute('data-hit-id', differentHit.id);
  });

  it('should pass dataView correctly to LogsOverview', () => {
    const differentDataView = { ...dataViewMock, id: 'different-data-view' } as typeof dataViewMock;

    render(<LogFlyoutContent {...defaultProps} logDataView={differentDataView} />);

    const logsOverview = screen.getByTestId('logsOverviewComponent');
    expect(logsOverview).toHaveAttribute('data-view-id', 'different-data-view');
  });
});
