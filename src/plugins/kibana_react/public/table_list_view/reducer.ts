/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { sortBy } from 'lodash';

import type { State } from './table_list_view';
import type { Action } from './actions';

export function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'onFetchItems': {
      return {
        ...state,
        isFetchingItems: true,
      };
    }

    case 'onFetchItemsSuccess': {
      return {
        ...state,
        hasInitialFetchReturned: true,
        isFetchingItems: false,
        items: !state.filter
          ? sortBy<T>(action.data.response.hits, 'title')
          : action.data.response.hits,
        totalItems: action.data.response.total,
        showLimitError: action.data.response.total > action.data.listingLimit,
      };
    }
    case 'onFetchItemsError': {
      return {
        ...state,
        hasInitialFetchReturned: true,
        isFetchingItems: false,
        items: [],
        totalItems: 0,
        showLimitError: false,
        fetchError: action.data,
      };
    }
    case 'onFilterChange': {
      return {
        ...state,
        filter: action.data,
        isFetchingItems: true,
      };
    }
    case 'onTableChange': {
      const tableSort = action.data.sort ?? state.tableSort;
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
    case 'onClickDeleteItems': {
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
          .map((item) => (item as unknown as { id?: string })?.id)
          .filter((id): id is string => Boolean(id)),
      };
    }
  }
}
