/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiDataGrid,
  EuiDataGridColumn,
  EuiDataGridColumnVisibility,
  EuiDataGridProps,
  EuiDataGridRefProps,
} from '@elastic/eui';
import classnames from 'classnames';
import React, { useCallback, useRef } from 'react';
import { GRID_STYLE } from '../../../../components/discover_grid/constants';
import { LOG_EXPLORER_VIRTUAL_GRID_ROWS } from '../../constants';
import { LogExplorerCell } from './log_explorer_grid_cell';

type GridOnItemsRenderedProps = Parameters<
  NonNullable<NonNullable<EuiDataGridProps['virtualizationOptions']>['onItemsRendered']>
>[0];

const EuiDataGridMemoized = React.memo(EuiDataGrid);

export function LogExplorerGrid() {
  const imperativeGridRef = useRef<EuiDataGridRefProps>();

  const onItemsRendered = useCallback(
    ({ visibleRowStartIndex, visibleRowStopIndex }: GridOnItemsRenderedProps) => {
      // TODO: trigger position update in state machine
      // if (visibleRowStartIndex === 0 && visibleRowStartIndex < startRowIndex) {
      //   // scroll to initial position
      //   imperativeGridRef.current?.scrollToItem?.({
      //     rowIndex: Math.floor((startRowIndex + endRowIndex) / 2),
      //     align: 'start',
      //   });
      // } else if (visibleRowStartIndex < startRowIndex) {
      //   // block scrolling outside of loaded area
      //   imperativeGridRef.current?.scrollToItem?.({
      //     rowIndex: startRowIndex,
      //     align: 'start',
      //   });
      // } else if (visibleRowStopIndex > endRowIndex) {
      //   // block scrolling outside of loaded area
      //   imperativeGridRef.current?.scrollToItem?.({
      //     rowIndex: endRowIndex,
      //     align: 'end',
      //   });
      // }
    },
    []
  );

  return (
    <span className="dscDiscoverGrid__inner">
      <div data-test-subj="discoverDocTable" className={classnames('dscDiscoverGrid__table')}>
        <EuiDataGridMemoized
          aria-label="log explorer grid"
          columns={columns}
          columnVisibility={columnVisibility}
          data-test-subj="logExplorerGrid"
          gridStyle={GRID_STYLE}
          rowCount={LOG_EXPLORER_VIRTUAL_GRID_ROWS}
          renderCellValue={LogExplorerCell}
        />
      </div>
    </span>
  );
}

const columns: EuiDataGridColumn[] = [
  {
    id: '@timestamp',
    initialWidth: 200,
  },
  {
    id: 'message',
  },
];
const columnVisibility: EuiDataGridColumnVisibility = {
  setVisibleColumns: () => {},
  visibleColumns: ['@timestamp', 'message'],
};
