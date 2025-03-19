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
import { CustomGridBodyProps, NonVirtualizedGridBody } from './non_virtualized_grid_body';
import { mockAlerts } from '../mocks/context.mock';
import { ALERT_RULE_UUID, ALERT_STATUS } from '@kbn/rule-data-utils';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';

describe('NonVirtualizedGridBody', () => {
  const props: CustomGridBodyProps = {
    alerts: mockAlerts,
    isLoading: false,
    pageIndex: 0,
    pageSize: 10,
    actualGridStyle: {},
    visibleColumns: [{ id: ALERT_RULE_NAME }, { id: ALERT_RULE_UUID }, { id: ALERT_STATUS }],
    Cell: ({ visibleRowIndex, colIndex }) => (
      <div>
        {visibleRowIndex}:{colIndex}
      </div>
    ),
    stripes: false,
  };

  it('should render `alerts.length` rows (<= `pageSize`) when not loading', () => {
    render(<NonVirtualizedGridBody {...props} />);
    expect(screen.getAllByRole('row')).toHaveLength(mockAlerts.length);
  });

  it('should render `pageSize` rows when loading', () => {
    render(<NonVirtualizedGridBody {...props} isLoading />);
    expect(screen.getAllByRole('row')).toHaveLength(props.pageSize);
  });

  it('should render the provided Cell component for each row', () => {
    render(<NonVirtualizedGridBody {...props} />);
    mockAlerts.forEach((_a, visibleRowIndex) => {
      props.visibleColumns.forEach((_c, colIndex) => {
        expect(screen.getByText(`${visibleRowIndex}:${colIndex}`)).toBeInTheDocument();
      });
    });
  });

  it('should add striped class when stripes are enabled', () => {
    render(<NonVirtualizedGridBody {...props} stripes />);
    screen.getAllByRole('row').forEach((row, i) => {
      if (i % 2 !== 0) {
        expect(row).toHaveClass('euiDataGridRow--striped');
      } else {
        expect(row).not.toHaveClass('euiDataGridRow--striped');
      }
    });
  });
});
