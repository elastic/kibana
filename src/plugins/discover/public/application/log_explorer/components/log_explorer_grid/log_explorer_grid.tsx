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
  EuiDataGridColumnVisibility,
  EuiDataGridControlColumn,
  EuiDataGridRefProps,
  EuiDataGridStyle,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { i18n } from '@kbn/i18n';
import classnames from 'classnames';
import React, { useMemo, useRef, useCallback } from 'react';
import { useSelector } from '@xstate/react';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { convertValueToString } from '../../utils/convert_value_to_string';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getEuiGridColumns } from '../../../../components/discover_grid/discover_grid_columns';
import { LOG_EXPLORER_VIRTUAL_GRID_ROWS } from '../../constants';
import { LogExplorerCell, LogExplorerCellContext } from './log_explorer_grid_cell';
import { useOnItemsRendered } from './use_on_items_rendered';
import { useScrollInteractions } from './use_scroll_interactions';
import { useDiscoverColumnsContext } from '../../hooks/discover_state/use_columns';
import { useDiscoverStateContext } from '../../hooks/discover_state/use_discover_state';
import { ValueToStringConverter } from '../../../../types';
import { useEntries } from '../../hooks/query_data/use_state_machine';
import { memoizedSelectRows } from '../../state_machines';
import { useFieldEditor } from '../../hooks/ui/use_field_editor';

const EuiDataGridMemoized = React.memo(EuiDataGrid);

export function LogExplorerGrid({ fieldFormats }: { fieldFormats: FieldFormatsStart }) {
  const { actor: entriesActor } = useEntries();
  const { rows } = useSelector(entriesActor, memoizedSelectRows);
  const imperativeGridRef = useRef<EuiDataGridRefProps | null>(null);

  const onItemsRendered = useOnItemsRendered({ imperativeGridRef });
  useScrollInteractions({ imperativeGridRef });

  const cellContextValue = useMemo(() => ({ fieldFormats }), [fieldFormats]);

  const { columns, onSetColumns } = useDiscoverColumnsContext();

  // Access to Discover services
  const services = useDiscoverServices();

  // Access to "outer" Discover state
  const { dataView, state, onAddFilter } = useDiscoverStateContext();

  // In place editing of fields
  const onFieldEdited = useCallback(() => {
    entriesActor.send({ type: 'columnsChanged' });
  }, [entriesActor]);

  const { editField } = useFieldEditor({ dataView, onFieldEdited });

  const valueToStringConverter: ValueToStringConverter = useCallback(
    (rowIndex, columnId, options) => {
      return convertValueToString({
        rowIndex,
        rows,
        dataView,
        columnId,
        services,
        options,
      });
    },
    [rows, dataView, services]
  );

  const euiGridColumns = useMemo(
    () =>
      getEuiGridColumns({
        columns,
        rowsCount: rows.size,
        settings: state.grid,
        dataView,
        showTimeCol: false, // NOTE: This is handled as a default elsewhere. Ignores the advanced setting here.
        defaultColumns: false, // NOTE: We don't need a differentiation here between default and not. We don't require the functionality that brings.
        isSortEnabled: false, // NOTE: We disable sorting for the log explorer.
        services,
        valueToStringConverter,
        onFilter: onAddFilter as DocViewFilterFn, // TODO: Fix this if there's time. It's broken due to discover_grid_cell_actions handling of rows (and looking up state from the rows). It needs changing to understand our log explorer rows Map.
        editField,
      }),
    [
      columns,
      dataView,
      services,
      valueToStringConverter,
      state.grid,
      rows.size,
      onAddFilter,
      editField,
    ]
  );

  const columnVisibility: EuiDataGridColumnVisibility = useMemo(() => {
    return {
      setVisibleColumns: (newColumns: string[]) => {
        onSetColumns(newColumns, true);
      },
      visibleColumns: columns,
    };
  }, [columns, onSetColumns]);

  return (
    <span className="dscDiscoverGrid__inner">
      <div data-test-subj="discoverDocTable" className={classnames('dscDiscoverGrid__table')}>
        <LogExplorerCellContext.Provider value={cellContextValue}>
          <EuiDataGridMemoized
            aria-label="log explorer grid"
            columns={euiGridColumns}
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
        </LogExplorerCellContext.Provider>
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

const gridStyle: EuiDataGridStyle = {
  border: 'all',
  fontSize: 'm',
  cellPadding: 'm',
  rowHover: 'none',
};
