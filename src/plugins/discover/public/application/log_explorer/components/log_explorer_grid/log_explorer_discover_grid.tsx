/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridRefProps } from '@elastic/eui';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { useSelector } from '@xstate/react';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  DiscoverGrid,
  EuiDataGridPropOverrides,
} from '../../../../components/discover_grid/discover_grid';
import { useDiscoverColumnsContext } from '../../hooks/discover_state/use_columns';
import { useDiscoverStateContext } from '../../hooks/discover_state/use_discover_state';
import { useEntries, useStateMachineContext } from '../../hooks/query_data/use_state_machine';
import { selectDiscoverRows } from '../../state_machines';
import { useScrollInteractions } from './use_scroll_interactions';

const DiscoverGridMemoized = React.memo(DiscoverGrid);

export function LogExplorerDiscoverGrid({
  fieldFormats,
  savedSearch,
}: {
  fieldFormats: FieldFormatsStart;
  savedSearch: SavedSearch;
}) {
  const mainActor = useStateMachineContext();
  const { actor: entriesActor } = useEntries();
  const { generationId, rows } = useSelector(entriesActor, selectDiscoverRows);
  const imperativeGridRef = useRef<EuiDataGridRefProps | null>(null);

  const { onItemsRendered } = useScrollInteractions({ imperativeGridRef });

  const gridPropOverrides = useMemo(
    (): EuiDataGridPropOverrides => ({
      virtualizationOptions: {
        onItemsRendered,
      },
    }),
    [onItemsRendered]
  );

  // const cellContextValue = useMemo(() => ({ fieldFormats }), [fieldFormats]);

  const { columns, onSetColumns, onAddColumn, onRemoveColumn } = useDiscoverColumnsContext();

  // Access to Discover services
  // const {
  //   data: {
  //     query: { filterManager },
  //   },
  // } = useDiscoverServices();

  // Access to "outer" Discover state
  const { dataView, state, onAddFilter } = useDiscoverStateContext();

  // In place editing of fields
  const onFieldEdited = useCallback(() => {
    mainActor.send({ type: 'columnsChanged' });
  }, [mainActor]);

  // const { editField } = useFieldEditor({ dataView, onFieldEdited });

  // const valueToStringConverter: ValueToStringConverter = useCallback(
  //   (rowIndex, columnId, options) => {
  //     return convertValueToString({
  //       rowIndex,
  //       rows,
  //       dataView,
  //       columnId,
  //       services,
  //       options,
  //     });
  //   },
  //   [rows, dataView, services]
  // );

  // const euiGridColumns = useMemo(
  //   () =>
  //     getEuiGridColumns({
  //       columns,
  //       rowsCount: rows.size,
  //       settings: state.grid,
  //       dataView,
  //       showTimeCol: false, // NOTE: This is handled as a default elsewhere. Ignores the advanced setting here.
  //       defaultColumns: false, // NOTE: We don't need a differentiation here between default and not. We don't require the functionality that brings.
  //       isSortEnabled: false, // NOTE: We disable sorting for the log explorer.
  //       services,
  //       valueToStringConverter,
  //       onFilter: onAddFilter as DocViewFilterFn, // TODO: Fix this if there's time. It's broken due to discover_grid_cell_actions handling of rows (and looking up state from the rows). It needs changing to understand our log explorer rows Map.
  //       editField,
  //     }),
  //   [
  //     columns,
  //     dataView,
  //     services,
  //     valueToStringConverter,
  //     state.grid,
  //     rows.size,
  //     onAddFilter,
  //     editField,
  //   ]
  // );

  // const columnVisibility: EuiDataGridColumnVisibility = useMemo(() => {
  //   return {
  //     setVisibleColumns: (newColumns: string[]) => {
  //       onSetColumns(newColumns, true);
  //     },
  //     visibleColumns: columns,
  //   };
  // }, [columns, onSetColumns]);

  return (
    <DiscoverGridMemoized
      ariaLabelledBy="documentsAriaLabel"
      columns={columns}
      // expandedDoc={expandedDoc}
      dataView={dataView}
      isLoading={false}
      rows={rows}
      sort={[]}
      // sort={(state.sort as SortPairArr[]) || []}
      sampleSize={rows.length}
      searchDescription={savedSearch.description}
      searchTitle={savedSearch.title}
      // setExpandedDoc={!isPlainRecord ? setExpandedDoc : undefined}
      showTimeCol={true}
      settings={state.grid}
      onAddColumn={onAddColumn}
      onFilter={onAddFilter}
      onRemoveColumn={onRemoveColumn}
      onSetColumns={onSetColumns}
      onSort={noop}
      onResize={noop}
      useNewFieldsApi={true}
      // rowHeightState={state.rowHeight}
      onUpdateRowHeight={noop}
      isSortEnabled={true}
      isPlainRecord={false}
      isPaginationEnabled={false}
      // rowsPerPageState={state.rowsPerPage}
      // onUpdateRowsPerPage={onUpdateRowsPerPage}
      onFieldEdited={onFieldEdited}
      gridRef={imperativeGridRef}
      generationId={generationId}
      gridPropOverrides={gridPropOverrides}
    />
  );
}

const noop = (...args: unknown[]) => {};
