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
  Search,
  type EuiTableSelectionType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { UserProfile } from '@kbn/user-profile-components';

import { useServices } from '../services';
import type { Action } from '../actions';
import type {
  State as TableListViewState,
  TableListViewTableProps,
} from '../table_list_view_table';
import type { TableItemsRowActions } from '../types';
import { TableSortSelect } from './table_sort_select';
import { TagFilterPanel } from './tag_filter_panel';
import { useTagFilterPanel } from './use_tag_filter_panel';
import type { Params as UseTagFilterPanelParams } from './use_tag_filter_panel';
import type { SortColumnField } from './table_sort_select';
import { UserFilterPanel, UserFilterContextProvider } from './user_filter_panel';

type State<T extends UserContentCommonSchema> = Pick<
  TableListViewState<T>,
  'items' | 'selectedIds' | 'searchQuery' | 'tableSort' | 'pagination' | 'tableFilter'
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
  deleteItems: TableListViewTableProps<T>['deleteItems'];
  tableItemsRowActions: TableItemsRowActions;
  renderCreateButton: () => React.ReactElement | undefined;
  onSortChange: (column: SortColumnField, direction: Direction) => void;
  onTableChange: (criteria: CriteriaWithPagination<T>) => void;
  onFilterChange: (filter: Partial<State<T>['tableFilter']>) => void;
  onTableSearchChange: (arg: { query: Query | null; queryText: string }) => void;
  clearTagSelection: () => void;
  suggestUsers?: () => Promise<UserProfile[]>;
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
  tableFilter,
  hasUpdatedAtMetadata,
  entityName,
  entityNamePlural,
  tagsToTableItemMap,
  tableItemsRowActions,
  deleteItems,
  renderCreateButton,
  tableCaption,
  onTableChange,
  onTableSearchChange,
  onSortChange,
  onFilterChange,
  addOrRemoveExcludeTagFilter,
  addOrRemoveIncludeTagFilter,
  clearTagSelection,
  suggestUsers,
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

  const selection = useMemo<EuiTableSelectionType<T> | undefined>(() => {
    if (deleteItems) {
      return {
        onSelectionChange: (obj: T[]) => {
          dispatch({ type: 'onSelectionChange', data: obj });
        },
        selectable: (obj) => {
          const actions = tableItemsRowActions[obj.id];
          return actions?.delete?.enabled !== false;
        },
        selectableMessage: (selectable, obj) => {
          if (!selectable) {
            const actions = tableItemsRowActions[obj.id];
            return (
              actions?.delete?.reason ??
              i18n.translate('contentManagement.tableList.actionsDisabledLabel', {
                defaultMessage: 'Actions disabled for this item',
              })
            );
          }
          return '';
        },
        initialSelected: [],
      };
    }
  }, [deleteItems, dispatch, tableItemsRowActions]);

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

  const userFilterPanel = useMemo<SearchFilterConfig | null>(() => {
    return suggestUsers
      ? {
          type: 'custom_component',
          component: UserFilterPanel,
        }
      : null;
  }, [suggestUsers]);

  const searchFilters = useMemo(() => {
    return [tableSortSelectFilter, tagFilterPanel, userFilterPanel].filter(
      Boolean
    ) as SearchFilterConfig[];
  }, [tableSortSelectFilter, tagFilterPanel, userFilterPanel]);

  const search = useMemo((): Search => {
    return {
      onChange: onTableSearchChange,
      toolsLeft: renderToolsLeft(),
      toolsRight: renderCreateButton(),
      query: searchQuery.query ?? undefined,
      box: {
        incremental: true,
        'data-test-subj': 'tableListSearchBox',
      },
      filters: searchFilters,
    };
  }, [onTableSearchChange, renderCreateButton, renderToolsLeft, searchFilters, searchQuery.query]);

  const noItemsMessage = (
    <FormattedMessage
      id="contentManagement.tableList.listing.noMatchedItemsMessage"
      defaultMessage="No {entityNamePlural} matched your search."
      values={{ entityNamePlural }}
    />
  );

  const visibleItems = React.useMemo(() => {
    if (tableFilter?.createdBy?.length > 0) {
      return items.filter(
        (item) => item.createdBy && tableFilter.createdBy?.includes(item.createdBy)
      );
    }

    return items;
  }, [items, tableFilter]);

  return (
    <UserFilterContextProvider
      suggestUsers={suggestUsers}
      onSelectedUsersChange={(selectedUsers) => {
        onFilterChange({ createdBy: selectedUsers });
      }}
      selectedUsers={tableFilter.createdBy}
    >
      <EuiInMemoryTable<T>
        itemId="id"
        items={visibleItems}
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
        isSelectable
      />
    </UserFilterContextProvider>
  );
}
