/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  FindListItemSchema,
  ListItemSchema,
  deleteListItemSchema,
  patchListItemSchema,
  createListItemSchema,
  findListItemSchema,
  foundListItemSchema,
  listItemSchema,
  FoundListItemSchema,
  DeleteListItemSchema,
  PatchListItemSchema,
  CreateListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { chain, fromEither, tryCatch } from 'fp-ts/lib/TaskEither';
import { flow } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { validateEither } from '@kbn/securitysolution-io-ts-utils';

import { LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import {
  ApiParams,
  FindListItemsParams,
  DeleteListItemParams,
  PatchListItemParams,
  CreateListItemParams,
} from '../types';
import { toError, toPromise } from '../fp_utils';

const version = '2023-10-31';

/**
 * Fetch list items
 */
const findListItems = async ({
  http,
  cursor,
  page,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  list_id,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  per_page,
  signal,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  sort_field,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  sort_order,
  filter,
}: ApiParams & FindListItemSchema): Promise<FoundListItemSchema> => {
  return http.fetch(`${LIST_ITEM_URL}/_find`, {
    method: 'GET',
    query: {
      cursor,
      page,
      per_page,
      sort_field,
      sort_order,
      list_id,
      filter,
    },
    signal,
    version,
  });
};

const findListItemsWithValidation = async ({
  cursor,
  http,
  pageIndex,
  pageSize,
  signal,
  sortField,
  sortOrder,
  filter,
  listId,
}: FindListItemsParams): Promise<FoundListItemSchema> =>
  pipe(
    {
      cursor: cursor != null ? cursor.toString() : undefined,
      page: pageIndex != null ? pageIndex.toString() : undefined,
      per_page: pageSize != null ? pageSize.toString() : undefined,
      sort_field: sortField != null ? sortField.toString() : undefined,
      filter: filter != null ? filter.toString() : undefined,
      sort_order: sortOrder,
      list_id: listId,
    },
    (payload) => fromEither(validateEither(findListItemSchema, payload)),
    chain((payload) => tryCatch(() => findListItems({ http, signal, ...payload }), toError)),
    chain((response) => fromEither(validateEither(foundListItemSchema, response))),
    flow(toPromise)
  );

export { findListItemsWithValidation as findListItems };

const deleteListItem = async ({
  http,
  id,
  signal,
  refresh,
}: ApiParams & DeleteListItemSchema): Promise<ListItemSchema> =>
  http.fetch<ListItemSchema>(LIST_ITEM_URL, {
    method: 'DELETE',
    query: { id, refresh },
    signal,
    version,
  });

const deleteListItemWithValidation = async ({
  http,
  id,
  signal,
  refresh,
}: DeleteListItemParams): Promise<ListItemSchema> =>
  pipe(
    { id, refresh },
    (payload) => fromEither(validateEither(deleteListItemSchema, payload)),
    chain((payload) =>
      tryCatch(
        () =>
          deleteListItem({
            http,
            signal,
            ...payload,
            value: undefined,
            list_id: undefined,
          }),
        toError
      )
    ),
    chain((response) => fromEither(validateEither(listItemSchema, response))),
    flow(toPromise)
  );

export { deleteListItemWithValidation as deleteListItem };

const patchListItem = async ({
  http,
  id,
  signal,
  value,
  _version,
}: ApiParams & PatchListItemSchema): Promise<ListItemSchema> =>
  http.fetch<ListItemSchema>(LIST_ITEM_URL, {
    method: 'PATCH',
    body: JSON.stringify({ id, value, _version }),
    signal,
    version,
  });

const patchListItemWithValidation = async ({
  http,
  id,
  signal,
  value,
  refresh,
  _version,
}: PatchListItemParams): Promise<ListItemSchema> =>
  pipe(
    { id, value, _version, refresh },
    (payload) => fromEither(validateEither(patchListItemSchema, payload)),
    chain((payload) =>
      tryCatch(
        () =>
          patchListItem({
            http,
            signal,
            ...payload,
          }),
        toError
      )
    ),
    chain((response) => fromEither(validateEither(listItemSchema, response))),
    flow(toPromise)
  );

export { patchListItemWithValidation as patchListItem };

const createListItem = async ({
  http,
  signal,
  value,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  list_id,
  refresh,
}: ApiParams & CreateListItemSchema): Promise<ListItemSchema> =>
  http.fetch<ListItemSchema>(LIST_ITEM_URL, {
    method: 'POST',
    body: JSON.stringify({ value, list_id, refresh }),
    signal,
    version,
  });

const createListItemWithValidation = async ({
  http,
  signal,
  value,
  refresh,
  listId,
}: CreateListItemParams): Promise<ListItemSchema> =>
  pipe(
    { list_id: listId, value, refresh },
    (payload) => fromEither(validateEither(createListItemSchema, payload)),
    chain((payload) =>
      tryCatch(
        () =>
          createListItem({
            http,
            signal,
            ...payload,
          }),
        toError
      )
    ),
    chain((response) => fromEither(validateEither(listItemSchema, response))),
    flow(toPromise)
  );

export { createListItemWithValidation as createListItem };
