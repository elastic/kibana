/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonIcon,
  EuiDataGrid,
  EuiDataGridColumn,
  EuiDataGridColumnVisibility,
  EuiDataGridControlColumn,
  EuiDataGridRefProps,
  EuiDataGridStyle,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classnames from 'classnames';
import React, { useRef } from 'react';
import { LOG_EXPLORER_VIRTUAL_GRID_ROWS } from '../../constants';
import { LogExplorerCell } from './log_explorer_grid_cell';
import { useOnItemsRendered } from './use_on_items_rendered';

const EuiDataGridMemoized = React.memo(EuiDataGrid);

export function LogExplorerGrid() {
  const imperativeGridRef = useRef<EuiDataGridRefProps | null>(null);

  const onItemsRendered = useOnItemsRendered({ imperativeGridRef });

  return (
    <span className="dscDiscoverGrid__inner">
      <div data-test-subj="discoverDocTable" className={classnames('dscDiscoverGrid__table')}>
        <EuiDataGridMemoized
          aria-label="log explorer grid"
          columns={columns}
          columnVisibility={columnVisibility}
          data-test-subj="logExplorerGrid"
          gridStyle={gridStyle}
          leadingControlColumns={controlColumns}
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

const controlColumns: EuiDataGridControlColumn[] = [
  {
    id: 'openDetails',
    width: 24,
    headerCellRender: () => (
      <EuiScreenReaderOnly>
        <span>
          {i18n.translate('discover.controlColumnHeader', {
            defaultMessage: 'Control column',
          })}
        </span>
      </EuiScreenReaderOnly>
    ),
    rowCellRender: () => (
      <EuiButtonIcon
        aria-label="open row details"
        size="xs"
        iconSize="s"
        color="text"
        iconType="expand"
      />
    ),
  },
];

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
