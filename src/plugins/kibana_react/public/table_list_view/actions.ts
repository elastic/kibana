/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { HttpFetchError } from '@kbn/core/public';
import type { CriteriaWithPagination } from '@elastic/eui';

export interface OnFetchItemsAction {
  type: 'onFetchItems';
}

export interface OnFetchItemsSuccessAction<T> {
  type: 'onFetchItemsSuccess';
  data: {
    response: {
      total: number;
      hits: T[];
    };
    listingLimit: number;
  };
}

export interface OnFetchItemsErrorAction {
  type: 'onFetchItemsError';
  data: HttpFetchError;
}

export interface DeleteItemsActions {
  type: 'onCancelDeleteItems' | 'onDeleteItems' | 'onItemsDeleted';
}

export interface OnSelectionChangeAction<T> {
  type: 'onSelectionChange';
  data: T[];
}

export interface OnTableChangeAction<T> {
  type: 'onTableChange';
  data: CriteriaWithPagination<T>;
}

export interface OnClickDeleteItemsAction {
  type: 'onClickDeleteItems';
}

export interface OnFilterChangeAction {
  type: 'onFilterChange';
  data: string;
}

export type Action<T> =
  | OnFetchItemsAction
  | OnFetchItemsSuccessAction<T>
  | OnFetchItemsErrorAction
  | DeleteItemsActions
  | OnSelectionChangeAction<T>
  | OnTableChangeAction<T>
  | OnClickDeleteItemsAction
  | OnFilterChangeAction;
