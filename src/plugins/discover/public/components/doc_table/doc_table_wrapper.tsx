/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { Filter } from '@kbn/es-query';
import { TableHeader } from './components/table_header/table_header';
import { SHOW_MULTIFIELDS } from '../../../common';
import { TableRow } from './components/table_row';
import { DocViewFilterFn } from '../../services/doc_views/doc_views_types';
import { getShouldShowFieldHandler } from '../../utils/get_should_show_field_handler';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { DataTableRecord } from '../../types';

export interface DocTableProps {
  /**
   * Rows of classic table
   */
  rows: DataTableRecord[];
  /**
   * Columns of classic table
   */
  columns: string[];
  /**
   * Current DataView
   */
  dataView: DataView;
  /**
   * Current sorting
   */
  sort: string[][];
  /**
   * New fields api switch
   */
  useNewFieldsApi: boolean;
  /**
   * Current search description
   */
  searchDescription?: string;
  /**
   * Current shared item title
   */
  sharedItemTitle?: string;
  /**
   * Current data test subject
   */
  dataTestSubj: string;
  /**
   * Loading state
   */
  isLoading: boolean;
  /**
   * Filters applied by embeddalbe
   */
  filters?: Filter[];
  /**
   * Saved search id
   */
  savedSearchId?: string;
  /**
   * Filter callback
   */
  onFilter: DocViewFilterFn;
  /**
   * Sorting callback
   */
  onSort?: (sort: string[][]) => void;
  /**
   * Add columns callback
   */
  onAddColumn?: (column: string) => void;
  /**
   * Reordering column callback
   */
  onMoveColumn?: (columns: string, newIdx: number) => void;
  /**
   * Remove column callback
   */
  onRemoveColumn?: (column: string) => void;
}

export interface DocTableRenderProps {
  columnLength: number;
  rows: DataTableRecord[];
  renderRows: (row: DataTableRecord[]) => JSX.Element[];
  renderHeader: () => JSX.Element;
  onSkipBottomButtonClick: () => void;
}

export interface DocTableWrapperProps extends DocTableProps {
  /**
   * Renders Doc table content
   */
  render: (params: DocTableRenderProps) => JSX.Element;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const DocTableWrapper = forwardRef(
  (
    {
      render,
      columns,
      filters,
      savedSearchId,
      rows,
      dataView,
      onSort,
      onAddColumn,
      onMoveColumn,
      onRemoveColumn,
      sort,
      onFilter,
      useNewFieldsApi,
      searchDescription,
      sharedItemTitle,
      dataTestSubj,
      isLoading,
    }: DocTableWrapperProps,
    ref
  ) => {
    const { uiSettings } = useDiscoverServices();
    const showMultiFields = useMemo(() => uiSettings.get(SHOW_MULTIFIELDS, false), [uiSettings]);

    const onSkipBottomButtonClick = useCallback(async () => {
      // delay scrolling to after the rows have been rendered
      const bottomMarker = document.getElementById('discoverBottomMarker');

      while (rows.length !== document.getElementsByClassName('kbnDocTable__row').length) {
        await wait(50);
      }
      bottomMarker!.focus();
      await wait(50);
      bottomMarker!.blur();
    }, [rows]);

    const shouldShowFieldHandler = useMemo(
      () =>
        getShouldShowFieldHandler(
          dataView.fields.map((field: DataViewField) => field.name),
          dataView,
          showMultiFields
        ),
      [dataView, showMultiFields]
    );

    const renderHeader = useCallback(
      () => (
        <TableHeader
          columns={columns}
          dataView={dataView}
          onChangeSortOrder={onSort}
          onMoveColumn={onMoveColumn}
          onRemoveColumn={onRemoveColumn}
          sortOrder={sort as SortOrder[]}
        />
      ),
      [columns, dataView, onMoveColumn, onRemoveColumn, onSort, sort]
    );

    const renderRows = useCallback(
      (rowsToRender: DataTableRecord[]) => {
        return rowsToRender.map((current) => (
          <TableRow
            key={`${current.id}${current.raw._score}${current.raw._version}`}
            columns={columns}
            filters={filters}
            savedSearchId={savedSearchId}
            filter={onFilter}
            dataView={dataView}
            row={current}
            useNewFieldsApi={useNewFieldsApi}
            shouldShowFieldHandler={shouldShowFieldHandler}
            onAddColumn={onAddColumn}
            onRemoveColumn={onRemoveColumn}
          />
        ));
      },
      [
        columns,
        filters,
        savedSearchId,
        onFilter,
        dataView,
        useNewFieldsApi,
        shouldShowFieldHandler,
        onAddColumn,
        onRemoveColumn,
      ]
    );

    return (
      <div
        className="kbnDocTableWrapper eui-yScroll eui-xScroll"
        data-shared-item
        data-title={sharedItemTitle}
        data-description={searchDescription}
        data-test-subj={dataTestSubj}
        data-render-complete={!isLoading}
        ref={ref as React.MutableRefObject<HTMLDivElement>}
      >
        {rows.length !== 0 &&
          render({
            columnLength: columns.length,
            rows,
            onSkipBottomButtonClick,
            renderHeader,
            renderRows,
          })}
        {!rows.length && (
          <div className="kbnDocTable__error">
            <EuiText size="xs" color="subdued">
              <EuiIcon type="visualizeApp" size="m" color="subdued" />
              <EuiSpacer size="m" />
              <FormattedMessage
                id="discover.docTable.noResultsTitle"
                defaultMessage="No results found"
              />
            </EuiText>
          </div>
        )}
      </div>
    );
  }
);
