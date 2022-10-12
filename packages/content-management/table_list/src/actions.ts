/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { CriteriaWithPagination, Direction } from '@elastic/eui';

import type { SortColumnField } from './components';

/** Action to trigger a fetch of the table items */
export interface OnFetchItemsAction {
  type: 'onFetchItems';
}

/** Action to return the fetched table items */
export interface OnFetchItemsSuccessAction<T> {
  type: 'onFetchItemsSuccess';
  data: {
    response: {
      total: number;
      hits: T[];
    };
  };
}

/** Action to return any error while fetching the table items */
export interface OnFetchItemsErrorAction {
  type: 'onFetchItemsError';
  data: IHttpFetchError<Error>;
}

/**
 * Actions to update the state of items deletions
 * - onDeleteItems: emit before deleting item(s)
 * - onItemsDeleted: emit after deleting item(s)
 * - onCancelDeleteItems: emit to cancel deleting items (and close the modal)
 */
export interface DeleteItemsActions {
  type: 'onCancelDeleteItems' | 'onDeleteItems' | 'onItemsDeleted';
}

/** Action to update the selection of items in the table (for batch operations) */
export interface OnSelectionChangeAction<T> {
  type: 'onSelectionChange';
  data: T[];
}

/** Action to update the state of the table whenever the sort or page size changes */
export interface OnTableChangeAction<T> {
  type: 'onTableChange';
  data: CriteriaWithPagination<T>;
}

/** Action to update the sort column of the table */
export interface OnTableSortChangeAction<T> {
  type: 'onTableSortChange';
  data: {
    field: SortColumnField;
    direction: Direction;
  };
}

/** Action to display the delete confirmation modal  */
export interface ShowConfirmDeleteItemsModalAction {
  type: 'showConfirmDeleteItemsModal';
}

/** Action to update the search bar query text */
export interface OnSearchQueryChangeAction {
  type: 'onSearchQueryChange';
  data: string;
}

export type Action<T> =
  | OnFetchItemsAction
  | OnFetchItemsSuccessAction<T>
  | OnFetchItemsErrorAction
  | DeleteItemsActions
  | OnSelectionChangeAction<T>
  | OnTableChangeAction<T>
  | OnTableSortChangeAction<T>
  | ShowConfirmDeleteItemsModalAction
  | OnSearchQueryChangeAction;
