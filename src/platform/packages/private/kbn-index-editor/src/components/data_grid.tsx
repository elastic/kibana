/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiIcon,
  EuiLink,
  EuiText,
  EuiPortal,
  EuiDataGridCellProps,
  EuiDataGridCellPopoverElementProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils/types';
import type { AggregateQuery } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  DataLoadingState,
  UnifiedDataTable,
  UnifiedDataTableRenderCustomToolbarProps,
  renderCustomToolbar,
  type SortOrder,
  CustomCellRenderer,
} from '@kbn/unified-data-table';
import React, { useCallback, useMemo, useState } from 'react';
import { INDEX_EDITOR_CELL_ACTION_TRIGGER_ID } from '../ui_action';
import { KibanaContextExtra } from '../types';
import { RowViewer } from './row_viewer_lazy';
import { EditCellValue } from './value_input_control';

interface ESQLDataGridProps {
  rows: DataTableRecord[];
  dataView: DataView;
  columns: DatatableColumn[];
  query: AggregateQuery;
  flyoutType?: 'overlay' | 'push';
  initialColumns?: DatatableColumn[];
  initialRowHeight?: number;
  controlColumnIds?: string[];
  totalHits?: number;
}

const sortOrder: SortOrder[] = [];
const DEFAULT_INITIAL_ROW_HEIGHT = 5;
const DEFAULT_ROWS_PER_PAGE = 10;
const ROWS_PER_PAGE_OPTIONS = [10, 25];

const DataGrid: React.FC<ESQLDataGridProps> = (props) => {
  const {
    services: {
      uiActions,
      fieldFormats,
      theme,
      uiSettings,
      share,
      data,
      notifications,
      settings,
      dataViewFieldEditor,
      indexUpdateService,
    },
  } = useKibana<KibanaContextExtra>();

  const { rows } = props;

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);
  const [activeColumns, setActiveColumns] = useState<string[]>(
    (props.initialColumns || props.columns).map((c) => c.name)
  );
  const [rowHeight, setRowHeight] = useState<number>(
    props.initialRowHeight ?? DEFAULT_INITIAL_ROW_HEIGHT
  );
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  const onSetColumns = useCallback((columns: string[]) => {
    setActiveColumns(columns);
  }, []);

  const renderDocumentView = useCallback(
    (
      hit: DataTableRecord,
      displayedRows: DataTableRecord[],
      displayedColumns: string[],
      customColumnsMeta?: DataTableColumnsMeta
    ) => (
      <RowViewer
        dataView={props.dataView}
        notifications={notifications}
        hit={hit}
        hits={displayedRows}
        columns={displayedColumns}
        columnsMeta={customColumnsMeta}
        flyoutType={props.flyoutType ?? 'push'}
        onRemoveColumn={(column) => {
          setActiveColumns(activeColumns.filter((c) => c !== column));
        }}
        onAddColumn={(column) => {
          setActiveColumns([...activeColumns, column]);
        }}
        onClose={() => setExpandedDoc(undefined)}
        setExpandedDoc={setExpandedDoc}
      />
    ),
    [activeColumns, notifications, props.dataView, props.flyoutType]
  );

  const columnsMeta = useMemo(() => {
    return props.columns.reduce((acc, column) => {
      acc[column.id] = {
        type: column.meta?.type,
        esType: column.meta?.esType ?? column.meta?.type,
      };
      return acc;
    }, {} as DataTableColumnsMeta);
  }, [props.columns]);

  const services = useMemo(() => {
    const storage = new Storage(localStorage);

    return {
      data,
      theme,
      uiSettings,
      toastNotifications: notifications.toasts,
      dataViewFieldEditor,
      fieldFormats,
      storage,
    };
  }, [data, theme, uiSettings, notifications.toasts, dataViewFieldEditor, fieldFormats]);

  const discoverLocator = useMemo(() => {
    return share?.url.locators.get('DISCOVER_APP_LOCATOR');
  }, [share?.url.locators]);

  const renderToolbar = useCallback(
    (customToolbarProps: UnifiedDataTableRenderCustomToolbarProps) => {
      const discoverLink = discoverLocator?.getRedirectUrl({
        dataViewSpec: props.dataView.toSpec(),
        timeRange: data.query.timefilter.timefilter.getTime(),
        query: props.query,
        columns: activeColumns,
      });
      return renderCustomToolbar({
        ...customToolbarProps,
        toolbarProps: {
          ...customToolbarProps.toolbarProps,
          hasRoomForGridControls: true,
        },
        gridProps: {
          inTableSearchControl: customToolbarProps.gridProps.inTableSearchControl,
          additionalControls: (
            <EuiLink
              href={discoverLink}
              target="_blank"
              color="primary"
              css={css`
                display: flex;
                align-items: center;
              `}
              external={false}
            >
              <EuiIcon
                type="discoverApp"
                size="s"
                color="primary"
                css={css`
                  margin-right: 4px;
                `}
              />
              <EuiText size="xs">
                {i18n.translate('esqlDataGrid.openInDiscoverLabel', {
                  defaultMessage: 'Open in Discover',
                })}
              </EuiText>
            </EuiLink>
          ),
        },
      });
    },
    [activeColumns, discoverLocator, data.query.timefilter.timefilter, props.dataView, props.query]
  );

  // temp solution. need to render an input on click on the cell.
  const customPopoverRenderer = useMemo<EuiDataGridCellProps['renderCellPopover']>(() => {
    return ({ rowIndex, columnId, ...rest }: EuiDataGridCellPopoverElementProps) => {
      const row = rows[rowIndex];
      const docId = row.id;
      const cellValue = row.flattened[columnId];
      if (cellValue == null) {
        return null;
      }

      return (
        <EditCellValue
          value={cellValue}
          onSave={(updatedValue) =>
            indexUpdateService.updateDoc(docId, { [columnId]: updatedValue })
          }
          onCancel={() => {}}
        />
      );
    };
  }, [indexUpdateService, rows]);

  return (
    <>
      <UnifiedDataTable
        columns={activeColumns}
        css={css`
          .unifiedDataTableToolbar {
            padding: 4px 0px;
          }
        `}
        rows={rows}
        columnsMeta={columnsMeta}
        // cellContext={cellContext}
        services={services}
        enableInTableSearch
        // externalCustomRenderers={externalCustomRenderers}
        isPlainRecord
        isSortEnabled
        showMultiFields={false}
        showColumnTokens
        showTimeCol
        enableComparisonMode
        isPaginationEnabled
        showKeyboardShortcuts
        totalHits={props.totalHits}
        rowsPerPageState={rowsPerPage}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        sampleSizeState={10_000}
        canDragAndDropColumns
        loadingState={DataLoadingState.loaded}
        dataView={props.dataView}
        onSetColumns={onSetColumns}
        onUpdateRowsPerPage={setRowsPerPage}
        expandedDoc={expandedDoc}
        setExpandedDoc={setExpandedDoc}
        sort={sortOrder}
        ariaLabelledBy="lookupIndexDataGrid"
        maxDocFieldsDisplayed={100}
        renderDocumentView={renderDocumentView}
        showFullScreenButton={false}
        configRowHeight={DEFAULT_INITIAL_ROW_HEIGHT}
        rowHeightState={rowHeight}
        onUpdateRowHeight={setRowHeight}
        controlColumnIds={props.controlColumnIds}
        renderCustomToolbar={discoverLocator ? renderToolbar : undefined}
        disableCellActions
        disableCellPopover
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default DataGrid;
