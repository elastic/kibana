/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { State, UserContentCommonSchema } from './table_list_view';
import type { Action } from './actions';

export function getReducer<T extends UserContentCommonSchema>() {
  let sortColumnChanged = false;

  return (state: State<T>, action: Action<T>): State<T> => {
    switch (action.type) {
      case 'onFetchItems': {
        return {
          ...state,
          isFetchingItems: true,
        };
      }
      case 'onFetchItemsSuccess': {
        const items = action.data.response.hits;
        let tableSort;
        let hasUpdatedAtMetadata = state.hasUpdatedAtMetadata;

        if (!state.hasInitialFetchReturned) {
          // We only get the state on the initial fetch of items
          // After that we don't want to reset the columns or change the sort after fetching
          hasUpdatedAtMetadata = Boolean(items.find((item) => Boolean(item.updatedAt)));

          // Only change the table sort if it hasn't been changed already.
          // For example if its state comes from the URL, we don't want to override it here.
          if (hasUpdatedAtMetadata && !sortColumnChanged) {
            tableSort = {
              field: 'updatedAt' as const,
              direction: 'desc' as const,
            };
          }
        }

        return {
          ...state,
          hasInitialFetchReturned: true,
          isFetchingItems: false,
          items,
          totalItems: action.data.response.total,
          hasUpdatedAtMetadata,
          tableSort: tableSort ?? state.tableSort,
          pagination: {
            ...state.pagination,
            totalItemCount: items.length,
          },
        };
      }
      case 'onFetchItemsError': {
        return {
          ...state,
          isFetchingItems: false,
          items: [],
          totalItems: 0,
          fetchError: action.data,
        };
      }
      case 'onSearchQueryChange': {
        if (action.data.text === state.searchQuery.text) {
          return state;
        }

        return {
          ...state,
          searchQuery: action.data,
          isFetchingItems: true,
        };
      }
      case 'onTableChange': {
        if (action.data.sort) {
          sortColumnChanged = true;
        }

        const tableSort = action.data.sort ?? state.tableSort;
        const pageIndex = action.data.page?.pageIndex ?? state.pagination.pageIndex;
        const pageSize = action.data.page?.pageSize ?? state.pagination.pageSize;

        return {
          ...state,
          pagination: {
            ...state.pagination,
            pageIndex,
            pageSize,
          },
          tableSort,
        };
      }
      case 'showConfirmDeleteItemsModal': {
        return {
          ...state,
          showDeleteModal: true,
        };
      }
      case 'onDeleteItems': {
        return {
          ...state,
          isDeletingItems: true,
        };
      }
      case 'onCancelDeleteItems': {
        return {
          ...state,
          showDeleteModal: false,
        };
      }
      case 'onItemsDeleted': {
        return {
          ...state,
          isDeletingItems: false,
          selectedIds: [],
          showDeleteModal: false,
        };
      }
      case 'onSelectionChange': {
        return {
          ...state,
          selectedIds: action.data
            .map((item) => item?.id)
            .filter((id): id is string => Boolean(id)),
        };
      }
    }
  };
}
