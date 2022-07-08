/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { sortBy } from 'lodash';
import { i18n } from '@kbn/i18n';

import { UpdatedAtField } from './components';
import type { State } from './table_list_view';
import type { Action, OnFetchItemsSuccessAction } from './actions';

function getTableState<T>(state: State<T>, action: OnFetchItemsSuccessAction<T>) {
  let tableColumns: State<T>['tableColumns'] = [];
  let tableSort = state.tableSort;
  const items = action.data.response.hits;

  // We check if the saved object have the "updatedAt" metadata
  // to render or not that column in the table
  const hasUpdatedAtMetadata = Boolean(
    items.find((item: { updatedAt?: string }) => Boolean(item.updatedAt))
  );

  if (hasUpdatedAtMetadata) {
    // Add "Last update" column and sort by that column initially
    tableSort = {
      field: 'updatedAt' as keyof T,
      direction: 'desc' as const,
    };

    tableColumns = [
      {
        field: 'updatedAt',
        name: i18n.translate('kibana-react.tableListView.lastUpdatedColumnTitle', {
          defaultMessage: 'Last updated',
        }),
        render: (field: string, record: { updatedAt?: string }) => (
          <UpdatedAtField dateTime={record.updatedAt} />
        ),
        sortable: true,
        width: '150px',
      },
    ];
  }

  return {
    tableColumns,
    tableSort,
  };
}

export function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'onFetchItems': {
      return {
        ...state,
        isFetchingItems: true,
      };
    }
    case 'onFetchItemsSuccess': {
      const items = action.data.response.hits;
      const isFirstFetch = state.tableColumns === null && state.items.length === 0;

      const tableColumnState =
        // We only get the state on the initial fetch of items
        // and tableColumns is still null. After that we don't want to reset
        // the columns or change the sort after fetching
        isFirstFetch ? getTableState(state, action) : {};

      return {
        ...state,
        hasInitialFetchReturned: true,
        isFetchingItems: false,
        items: !state.searchQuery ? sortBy<T>(items, 'title') : items,
        totalItems: action.data.response.total,
        ...tableColumnState,
        pagination: {
          ...state.pagination,
          totalItemCount: items.length,
        },
      };
    }
    case 'onFetchItemsError': {
      return {
        ...state,
        hasInitialFetchReturned: true,
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
