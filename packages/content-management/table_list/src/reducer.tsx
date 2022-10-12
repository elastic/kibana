/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { sortBy } from 'lodash';

import type { State, UserContentCommonSchema } from './table_list_view';
import type { Action } from './actions';

export function getReducer<T extends UserContentCommonSchema>() {
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
          if (hasUpdatedAtMetadata) {
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
          items: !state.searchQuery ? sortBy<T>(items, 'title') : items,
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
        return {
          ...state,
          searchQuery: action.data,
          isFetchingItems: true,
        };
      }
      case 'onTableChange': {
        const tableSort = (action.data.sort as State['tableSort']) ?? state.tableSort;
        return {
          ...state,
          pagination: {
            ...state.pagination,
            pageIndex: action.data.page.index,
            pageSize: action.data.page.size,
          },
          tableSort,
        };
      }
      case 'onTableSortChange': {
        return {
          ...state,
          tableSort: action.data,
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
