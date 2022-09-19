/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Dispatch, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBasicTableColumn,
  EuiButton,
  EuiInMemoryTable,
  CriteriaWithPagination,
  PropertySort,
} from '@elastic/eui';

import { useServices } from '../services';
import type { Action } from '../actions';
import type {
  State as TableListViewState,
  Props as TableListViewProps,
  UserContentCommonSchema,
} from '../table_list_view';

type State<T extends UserContentCommonSchema> = Pick<
  TableListViewState<T>,
  'items' | 'selectedIds' | 'searchQuery' | 'tableSort' | 'pagination'
>;

interface Props<T extends UserContentCommonSchema> extends State<T> {
  dispatch: Dispatch<Action<T>>;
  entityName: string;
  entityNamePlural: string;
  isFetchingItems: boolean;
  tableCaption: string;
  tableColumns: Array<EuiBasicTableColumn<T>>;
  deleteItems: TableListViewProps<T>['deleteItems'];
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
  entityName,
  entityNamePlural,
  deleteItems,
  tableCaption,
}: Props<T>) {
  const { getSearchBarFilters } = useServices();

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

  const searchFilters = getSearchBarFilters ? getSearchBarFilters() : [];

  const search = {
    onChange: ({ queryText }: { queryText: string }) =>
      dispatch({ type: 'onSearchQueryChange', data: queryText }),
    toolsLeft: renderToolsLeft(),
    defaultQuery: searchQuery,
    box: {
      incremental: true,
      'data-test-subj': 'tableListSearchBox',
    },
    filters: searchFilters,
  };

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
      sorting={tableSort ? { sort: tableSort as PropertySort } : undefined}
      onChange={(criteria: CriteriaWithPagination<T>) =>
        dispatch({ type: 'onTableChange', data: criteria })
      }
      data-test-subj="itemsInMemTable"
      rowHeader="attributes.title"
      tableCaption={tableCaption}
    />
  );
}
