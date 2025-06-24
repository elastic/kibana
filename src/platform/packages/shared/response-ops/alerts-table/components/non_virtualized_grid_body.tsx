/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import styled from '@emotion/styled';
import { EuiDataGridProps, EuiDataGridStyle } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';

const Row = styled.div`
  display: flex;
  min-width: fit-content;
`;

export type CustomGridBodyProps = Pick<
  Parameters<NonNullable<EuiDataGridProps['renderCustomGridBody']>>['0'],
  'Cell' | 'visibleColumns'
> & {
  alerts: Alert[];
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  actualGridStyle: EuiDataGridStyle;
  stripes?: boolean;
};

/**
 * Renders a non-virtualized grid body with the provided Cell component
 */
export const NonVirtualizedGridBody = memo(
  ({
    alerts,
    isLoading,
    pageIndex,
    pageSize,
    actualGridStyle,
    visibleColumns,
    Cell,
    stripes,
  }: CustomGridBodyProps) => {
    return (
      <>
        {alerts
          .concat(isLoading ? Array.from({ length: pageSize - alerts.length }) : [])
          .map((_row, rowIndex) => (
            <Row
              role="row"
              key={`${rowIndex},${pageIndex}`}
              // Manually add stripes if props.gridStyle.stripes is true because presence of rowClasses
              // overrides the props.gridStyle.stripes option. And rowClasses will always be there.
              // Adding stripes only on even rows. It will be replaced by alertsTableHighlightedRow if
              // shouldHighlightRow is correct
              className={`euiDataGridRow ${
                stripes && rowIndex % 2 !== 0 ? 'euiDataGridRow--striped' : ''
              } ${actualGridStyle.rowClasses?.[rowIndex] ?? ''}`}
            >
              {visibleColumns.map((_col, colIndex) => (
                <Cell
                  colIndex={colIndex}
                  visibleRowIndex={rowIndex}
                  key={`${rowIndex},${colIndex}`}
                />
              ))}
            </Row>
          ))}
      </>
    );
  }
);
