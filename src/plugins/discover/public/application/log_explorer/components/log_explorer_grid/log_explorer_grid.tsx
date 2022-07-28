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
  EuiDataGridStyle,
} from '@elastic/eui';
import { useSelector } from '@xstate/react';
import classnames from 'classnames';
import React, { useCallback, useRef } from 'react';
import { LOG_EXPLORER_VIRTUAL_GRID_ROWS } from '../../constants';
import { useStateMachineContext } from '../../hooks/query_data/use_state_machine';
import { selectLoadedEntries } from '../../state_machines/data_access_state_machine';
import { LogExplorerCell } from './log_explorer_grid_cell';

type GridOnItemsRenderedProps = Parameters<
  NonNullable<NonNullable<EuiDataGridProps['virtualizationOptions']>['onItemsRendered']>
>[0];

const EuiDataGridMemoized = React.memo(EuiDataGrid);

export function LogExplorerGrid() {
  const imperativeGridRef = useRef<EuiDataGridRefProps | null>(null);

  const { startRowIndex, endRowIndex, chunkBoundaryRowIndex } = useSelector(
    useStateMachineContext(),
    selectLoadedEntries
  );

  const onItemsRendered = useCallback(
    ({ visibleRowStartIndex, visibleRowStopIndex }: GridOnItemsRenderedProps) => {
      if (startRowIndex == null || endRowIndex == null) {
        return;
      }

      // TODO: trigger position update in state machine
      if (visibleRowStartIndex === 0 && visibleRowStartIndex < startRowIndex) {
        // scroll to initial position
        imperativeGridRef.current?.scrollToItem?.({
          rowIndex: chunkBoundaryRowIndex,
          align: 'start',
        });
      } else if (visibleRowStartIndex < startRowIndex) {
        // block scrolling outside of loaded area
        imperativeGridRef.current?.scrollToItem?.({
          rowIndex: startRowIndex,
          align: 'start',
        });
      } else if (visibleRowStopIndex > endRowIndex) {
        // block scrolling outside of loaded area
        imperativeGridRef.current?.scrollToItem?.({
          rowIndex: endRowIndex,
          align: 'end',
        });
      }
    },
    [chunkBoundaryRowIndex, endRowIndex, startRowIndex]
  );

  return (
    <span className="dscDiscoverGrid__inner">
      <div data-test-subj="discoverDocTable" className={classnames('dscDiscoverGrid__table')}>
        <EuiDataGridMemoized
          aria-label="log explorer grid"
          columns={columns}
          columnVisibility={columnVisibility}
          data-test-subj="logExplorerGrid"
          gridStyle={gridStyle}
          ref={imperativeGridRef}
          rowCount={LOG_EXPLORER_VIRTUAL_GRID_ROWS}
          rowHeightsOptions={{
            defaultHeight: 34,
          }}
          renderCellValue={LogExplorerCell}
          toolbarVisibility={{
            showDisplaySelector: false,
          }}
          virtualizationOptions={{
            onItemsRendered,
          }}
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

const gridStyle: EuiDataGridStyle = {
  border: 'all',
  fontSize: 'm',
  cellPadding: 'm',
  rowHover: 'none',
};
