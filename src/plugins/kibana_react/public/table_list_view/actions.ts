/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { HttpFetchError } from '@kbn/core/public';
import type { CriteriaWithPagination } from '@elastic/eui';

interface OnFetchItemsAction {
  type: 'onFetchItems';
}
interface OnFetchItemsSuccessAction<T> {
  type: 'onFetchItemsSuccess';
  data: {
    response: {
      total: number;
      hits: T[];
    };
    listingLimit: number;
  };
}

interface OnFetchItemsErrorAction {
  type: 'onFetchItemsError';
  data: HttpFetchError;
}

interface DeleteItemsActions {
  type: 'onCancelDeleteItems' | 'onDeleteItems' | 'onItemsDeleted';
}

interface OnSelectionChangeAction<T> {
  type: 'onSelectionChange';
  data: T[];
}

interface OnTableChangeAction<T> {
  type: 'onTableChange';
  data: CriteriaWithPagination<T>;
}

interface OnClickDeleteItemsAction {
  type: 'onClickDeleteItems';
}

interface OnFilterChangeAction {
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
