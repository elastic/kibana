/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiInMemoryTable,
  Pagination,
  Direction,
  useEuiTheme,
  CriteriaWithPagination,
} from '@elastic/eui';
import type { BrowserFields } from '@kbn/rule-registry-plugin/common';
import { getFieldColumns, getFieldItemsData } from '../field_items';
import { CATEGORY_TABLE_CLASS_NAME, TABLE_HEIGHT } from '../../helpers';
import type { BrowserFieldItem, FieldBrowserProps, GetFieldTableColumns } from '../../types';
import { FieldTableHeader } from './field_table_header';
import { styles } from './field_table.styles';

const DEFAULT_SORTING: { field: keyof BrowserFieldItem; direction: Direction } = {
  field: 'name',
  direction: 'asc',
};

export interface FieldTableProps extends Pick<FieldBrowserProps, 'columnIds' | 'onToggleColumn'> {
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /** when true, show only the the selected field */
  filterSelectedEnabled: boolean;
  onFilterSelectedChange: (enabled: boolean) => void;
  /**
   * Optional function to customize field table columns
   */
  getFieldTableColumns?: GetFieldTableColumns;
  /**
   * The category selected on the left-hand side of the field browser
   */
  selectedCategoryIds: string[];
  /** The text displayed in the search input */
  /** Invoked when a user chooses to view a new set of columns in the timeline */
  searchInput: string;
  /**
   * Hides the field browser when invoked
   */
  onHide: () => void;
}

const FieldTableComponent: React.FC<FieldTableProps> = ({
  columnIds,
  filteredBrowserFields,
  filterSelectedEnabled,
  getFieldTableColumns,
  onFilterSelectedChange,
  onHide,
  onToggleColumn,
  searchInput,
  selectedCategoryIds,
}) => {
  const { euiTheme } = useEuiTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(DEFAULT_SORTING.field);
  const [sortDirection, setSortDirection] = useState<Direction>(DEFAULT_SORTING.direction);

  const { fieldItems } = useMemo(
    () =>
      getFieldItemsData({
        browserFields: filteredBrowserFields,
        selectedCategoryIds,
        columnIds,
      }),
    [columnIds, filteredBrowserFields, selectedCategoryIds]
  );

  /**
   * Pagination controls
   */
  const pagination: Pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: fieldItems.length,
      pageSizeOptions: [10, 25, 50],
    }),
    [fieldItems.length, pageIndex, pageSize]
  );

  useEffect(() => {
    // Resets the pagination when some filter has changed, consequently, the number of fields is different
    setPageIndex(0);
  }, [fieldItems.length]);

  /**
   * Sorting controls
   */
  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    }),
    [sortDirection, sortField]
  );

  const onTableChange = useCallback(
    ({ page, sort = DEFAULT_SORTING }: CriteriaWithPagination<BrowserFieldItem>) => {
      const { index, size } = page;
      const { field, direction } = sort;

      setPageIndex(index);
      setPageSize(size);

      setSortField(field);
      setSortDirection(direction);
    },
    []
  );

  /**
   * Process columns
   */
  const columns = useMemo(
    () =>
      getFieldColumns({
        getFieldTableColumns,
        highlight: searchInput,
        onHide,
        onToggleColumn,
      }),
    [getFieldTableColumns, searchInput, onHide, onToggleColumn]
  );

  return (
    <>
      <FieldTableHeader
        fieldCount={fieldItems.length}
        filterSelectedEnabled={filterSelectedEnabled}
        onFilterSelectedChange={onFilterSelectedChange}
      />

      <div css={styles.tableContainer({ height: TABLE_HEIGHT, euiTheme })}>
        <EuiInMemoryTable
          data-test-subj="field-table"
          className={`${CATEGORY_TABLE_CLASS_NAME} eui-yScroll`}
          items={fieldItems}
          itemId="name"
          columns={columns}
          pagination={pagination}
          sorting={sorting}
          onChange={onTableChange}
          compressed
        />
      </div>
    </>
  );
};
export const FieldTable = React.memo(FieldTableComponent);
