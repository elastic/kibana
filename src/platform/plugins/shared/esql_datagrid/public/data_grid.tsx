/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo } from 'react';
import { zipObject } from 'lodash';
import {
  UnifiedDataTable,
  DataLoadingState,
  type SortOrder,
  renderCustomToolbar,
  UnifiedDataTableRenderCustomToolbarProps,
} from '@kbn/unified-data-table';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ESQLRow } from '@kbn/es-types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { RowViewer } from './row_viewer_lazy';

interface ESQLDataGridProps {
  core: CoreStart;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  share?: SharePluginStart;
  rows: ESQLRow[];
  dataView: DataView;
  columns: DatatableColumn[];
  query: AggregateQuery;
  flyoutType?: 'overlay' | 'push';
  isTableView?: boolean;
  initialColumns?: DatatableColumn[];
  initialRowHeight?: number;
  controlColumnIds?: string[];
}

const sortOrder: SortOrder[] = [];
const DEFAULT_INITIAL_ROW_HEIGHT = 5;
const DEFAULT_ROWS_PER_PAGE = 10;
const ROWS_PER_PAGE_OPTIONS = [10, 25];

const DataGrid: React.FC<ESQLDataGridProps> = (props) => {
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);
  const [activeColumns, setActiveColumns] = useState<string[]>(
    (props.initialColumns || (props.isTableView ? props.columns : [])).map((c) => c.name)
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
        notifications={props.core.notifications}
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
    [activeColumns, props.core.notifications, props.dataView, props.flyoutType]
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

  const rows: DataTableRecord[] = useMemo(() => {
    const columnNames = props.columns?.map(({ name }) => name);
    return props.rows
      .map((row) => zipObject(columnNames, row))
      .map((row, idx: number) => {
        return {
          id: String(idx),
          raw: row,
          flattened: row,
        } as unknown as DataTableRecord;
      });
  }, [props.columns, props.rows]);

  const services = useMemo(() => {
    const storage = new Storage(localStorage);

    return {
      data: props.data,
      theme: props.core.theme,
      uiSettings: props.core.uiSettings,
      toastNotifications: props.core.notifications.toasts,
      fieldFormats: props.fieldFormats,
      storage,
    };
  }, [
    props.core.notifications.toasts,
    props.core.theme,
    props.core.uiSettings,
    props.data,
    props.fieldFormats,
  ]);

  const discoverLocator = useMemo(() => {
    return props.share?.url.locators.get('DISCOVER_APP_LOCATOR');
  }, [props.share?.url.locators]);

  const renderToolbar = useCallback(
    (customToolbarProps: UnifiedDataTableRenderCustomToolbarProps) => {
      const discoverLink = discoverLocator?.getRedirectUrl({
        dataViewSpec: props.dataView.toSpec(),
        timeRange: props.data.query.timefilter.timefilter.getTime(),
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
    [
      activeColumns,
      discoverLocator,
      props.data.query.timefilter.timefilter,
      props.dataView,
      props.query,
    ]
  );

  return (
    <UnifiedDataTable
      columns={activeColumns}
      css={css`
        .unifiedDataTableToolbar {
          padding: 4px 0px;
        }
      `}
      rows={rows}
      columnsMeta={columnsMeta}
      services={services}
      enableInTableSearch
      isPlainRecord
      isSortEnabled={false}
      loadingState={DataLoadingState.loaded}
      dataView={props.dataView}
      sampleSizeState={rows.length}
      rowsPerPageState={rowsPerPage}
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      onSetColumns={onSetColumns}
      onUpdateRowsPerPage={setRowsPerPage}
      expandedDoc={expandedDoc}
      setExpandedDoc={setExpandedDoc}
      showTimeCol
      enableComparisonMode
      sort={sortOrder}
      ariaLabelledBy="esqlDataGrid"
      maxDocFieldsDisplayed={100}
      renderDocumentView={renderDocumentView}
      showFullScreenButton={false}
      configRowHeight={DEFAULT_INITIAL_ROW_HEIGHT}
      rowHeightState={rowHeight}
      onUpdateRowHeight={setRowHeight}
      controlColumnIds={props.controlColumnIds}
      renderCustomToolbar={discoverLocator ? renderToolbar : undefined}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default DataGrid;
