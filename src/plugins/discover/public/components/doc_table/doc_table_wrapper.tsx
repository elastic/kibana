/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import type { DataView, DataViewField } from 'src/plugins/data_views/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { TableHeader } from './components/table_header/table_header';
import { SHOW_MULTIFIELDS } from '../../../common';
import { SortOrder } from './components/table_header/helpers';
import { DocTableRow, TableRow } from './components/table_row';
import { DocViewFilterFn } from '../../services/doc_views/doc_views_types';
import { getFieldsToShow } from '../../utils/get_fields_to_show';
import { useDiscoverServices } from '../../utils/use_discover_services';

export interface DocTableProps {
  /**
   * Rows of classic table
   */
  rows: DocTableRow[];
  /**
   * Columns of classic table
   */
  columns: string[];
  /**
   * Current DataView
   */
  indexPattern: DataView;
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
  rows: DocTableRow[];
  renderRows: (row: DocTableRow[]) => JSX.Element[];
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
      rows,
      indexPattern,
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

    const fieldsToShow = useMemo(
      () =>
        getFieldsToShow(
          indexPattern.fields.map((field: DataViewField) => field.name),
          indexPattern,
          showMultiFields
        ),
      [indexPattern, showMultiFields]
    );

    const renderHeader = useCallback(
      () => (
        <TableHeader
          columns={columns}
          indexPattern={indexPattern}
          onChangeSortOrder={onSort}
          onMoveColumn={onMoveColumn}
          onRemoveColumn={onRemoveColumn}
          sortOrder={sort as SortOrder[]}
        />
      ),
      [columns, indexPattern, onMoveColumn, onRemoveColumn, onSort, sort]
    );

    const renderRows = useCallback(
      (rowsToRender: DocTableRow[]) => {
        return rowsToRender.map((current) => (
          <TableRow
            key={`${current._index}${current._id}${current._score}${current._version}${current._routing}`}
            columns={columns}
            filter={onFilter}
            indexPattern={indexPattern}
            row={current}
            useNewFieldsApi={useNewFieldsApi}
            fieldsToShow={fieldsToShow}
            onAddColumn={onAddColumn}
            onRemoveColumn={onRemoveColumn}
          />
        ));
      },
      [columns, onFilter, indexPattern, useNewFieldsApi, fieldsToShow, onAddColumn, onRemoveColumn]
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
