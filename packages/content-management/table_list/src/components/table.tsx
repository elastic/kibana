/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Dispatch, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBasicTableColumn,
  EuiButton,
  EuiInMemoryTable,
  CriteriaWithPagination,
  PropertySort,
  SearchFilterConfig,
  Direction,
  Query,
  Ast,
} from '@elastic/eui';

import { useServices } from '../services';
import type { Action } from '../actions';
import type {
  State as TableListViewState,
  Props as TableListViewProps,
  UserContentCommonSchema,
} from '../table_list_view';
import { TableSortSelect } from './table_sort_select';
import { TagFilterPanel } from './tag_filter_panel';
import { useTagFilterPanel } from './use_tag_filter_panel';
import type { Params as UseTagFilterPanelParams } from './use_tag_filter_panel';
import type { SortColumnField } from './table_sort_select';

type State<T extends UserContentCommonSchema> = Pick<
  TableListViewState<T>,
  'items' | 'selectedIds' | 'searchQuery' | 'tableSort' | 'pagination'
>;

type TagManagementProps = Pick<
  UseTagFilterPanelParams,
  'addOrRemoveIncludeTagFilter' | 'addOrRemoveExcludeTagFilter' | 'tagsToTableItemMap'
>;

interface Props<T extends UserContentCommonSchema> extends State<T>, TagManagementProps {
  dispatch: Dispatch<Action<T>>;
  entityName: string;
  entityNamePlural: string;
  isFetchingItems: boolean;
  tableCaption: string;
  tableColumns: Array<EuiBasicTableColumn<T>>;
  hasUpdatedAtMetadata: boolean;
  deleteItems: TableListViewProps<T>['deleteItems'];
  onSortChange: (column: SortColumnField, direction: Direction) => void;
  onTableChange: (criteria: CriteriaWithPagination<T>) => void;
  clearTagSelection: () => void;
}

export function Table<T extends UserContentCommonSchema>({
  dispatch,
  items,
  isFetchingItems,
  searchQuery,
  selectedIds,
  pagination,
  tableColumns,
  tableSort,
  hasUpdatedAtMetadata,
  entityName,
  entityNamePlural,
  tagsToTableItemMap,
  deleteItems,
  tableCaption,
  onTableChange,
  onSortChange,
  addOrRemoveExcludeTagFilter,
  addOrRemoveIncludeTagFilter,
  clearTagSelection,
}: Props<T>) {
  const { getTagList } = useServices();

  const renderToolsLeft = useCallback(() => {
    if (!deleteItems || selectedIds.length === 0) {
      return;
    }

    return (
      <EuiButton
        color="danger"
        iconType="trash"
        onClick={() => dispatch({ type: 'showConfirmDeleteItemsModal' })}
        data-test-subj="deleteSelectedItems"
      >
        <FormattedMessage
          id="contentManagement.tableList.listing.deleteButtonMessage"
          defaultMessage="Delete {itemCount} {entityName}"
          values={{
            itemCount: selectedIds.length,
            entityName: selectedIds.length === 1 ? entityName : entityNamePlural,
          }}
        />
      </EuiButton>
    );
  }, [deleteItems, dispatch, entityName, entityNamePlural, selectedIds.length]);

  const selection = deleteItems
    ? {
        onSelectionChange: (obj: T[]) => {
          dispatch({ type: 'onSelectionChange', data: obj });
        },
      }
    : undefined;

  const {
    isPopoverOpen,
    isInUse,
    closePopover,
    onFilterButtonClick,
    onSelectChange,
    options,
    totalActiveFilters,
  } = useTagFilterPanel({
    query: searchQuery.query,
    getTagList,
    tagsToTableItemMap,
    addOrRemoveExcludeTagFilter,
    addOrRemoveIncludeTagFilter,
  });

  const onSearchQueryChange = useCallback(
    (arg: { query: Query | null; queryText: string }) => {
      dispatch({
        type: 'onSearchQueryChange',
        data: {
          query: arg.query ?? new Query(Ast.create([]), undefined, arg.queryText),
          text: arg.queryText,
        },
      });
    },
    [dispatch]
  );

  const tableSortSelectFilter = useMemo<SearchFilterConfig>(() => {
    return {
      type: 'custom_component',
      component: () => {
        return (
          <TableSortSelect
            tableSort={tableSort}
            hasUpdatedAtMetadata={hasUpdatedAtMetadata}
            onChange={onSortChange}
          />
        );
      },
    };
  }, [hasUpdatedAtMetadata, onSortChange, tableSort]);

  const tagFilterPanel = useMemo<SearchFilterConfig>(() => {
    return {
      type: 'custom_component',
      component: () => {
        return (
          <TagFilterPanel
            isPopoverOpen={isPopoverOpen}
            isInUse={isInUse}
            closePopover={closePopover}
            options={options}
            totalActiveFilters={totalActiveFilters}
            onFilterButtonClick={onFilterButtonClick}
            onSelectChange={onSelectChange}
            clearTagSelection={clearTagSelection}
          />
        );
      },
    };
  }, [
    isPopoverOpen,
    isInUse,
    closePopover,
    options,
    totalActiveFilters,
    onFilterButtonClick,
    onSelectChange,
    clearTagSelection,
  ]);

  const searchFilters = useMemo(() => {
    return [tableSortSelectFilter, tagFilterPanel];
  }, [tableSortSelectFilter, tagFilterPanel]);

  const search = useMemo(() => {
    return {
      onChange: onSearchQueryChange,
      toolsLeft: renderToolsLeft(),
      query: searchQuery.query ?? undefined,
      box: {
        incremental: true,
        'data-test-subj': 'tableListSearchBox',
      },
      filters: searchFilters,
    };
  }, [onSearchQueryChange, renderToolsLeft, searchFilters, searchQuery.query]);

  const noItemsMessage = (
    <FormattedMessage
      id="contentManagement.tableList.listing.noMatchedItemsMessage"
      defaultMessage="No {entityNamePlural} matched your search."
      values={{ entityNamePlural }}
    />
  );

  return (
    <EuiInMemoryTable<T>
      itemId="id"
      items={items}
      columns={tableColumns}
      pagination={pagination}
      loading={isFetchingItems}
      message={noItemsMessage}
      selection={selection}
      search={search}
      executeQueryOptions={{ enabled: false }}
      sorting={tableSort ? { sort: tableSort as PropertySort } : undefined}
      onChange={onTableChange}
      data-test-subj="itemsInMemTable"
      rowHeader="attributes.title"
      tableCaption={tableCaption}
    />
  );
}
