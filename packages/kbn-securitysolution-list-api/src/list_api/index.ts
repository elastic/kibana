/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chain, fromEither, map, tryCatch } from 'fp-ts/lib/TaskEither';
import { flow } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { validateEither } from '@kbn/securitysolution-io-ts-utils';
import {
  AcknowledgeSchema,
  DeleteListSchemaEncoded,
  ExportListItemQuerySchemaEncoded,
  FindListSchemaEncoded,
  FindListItemSchema,
  FoundListSchema,
  ImportListItemQuerySchemaEncoded,
  ImportListItemSchemaEncoded,
  ListItemIndexExistSchema,
  ListSchema,
  ListItemSchema,
  acknowledgeSchema,
  deleteListSchema,
  deleteListItemSchema,
  patchListItemSchema,
  exportListItemQuerySchema,
  findListSchema,
  foundListSchema,
  findListItemSchema,
  foundListItemSchema,
  importListItemQuerySchema,
  importListItemSchema,
  listItemIndexExistSchema,
  listSchema,
  listItemSchema,
  foundListsBySizeSchema,
  FoundListsBySizeSchema,
  FoundListItemSchema,
  DeleteListItemSchema,
  PatchListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  LIST_INDEX,
  LIST_ITEM_URL,
  LIST_PRIVILEGES_URL,
  LIST_URL,
  INTERNAL_FIND_LISTS_BY_SIZE,
} from '@kbn/securitysolution-list-constants';
import { toError, toPromise } from '../fp_utils';

import {
  ApiParams,
  DeleteListParams,
  ExportListParams,
  FindListsParams,
  ImportListParams,
  FindListItemsParams,
  DeleteListItemParams,
  PatchListItemParams,
} from './types';

export type {
  ApiParams,
  DeleteListParams,
  ExportListParams,
  FindListsParams,
  ImportListParams,
} from './types';

const version = '2023-10-31';

const findLists = async ({
  http,
  cursor,
  page,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  per_page,
  signal,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  sort_field,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  sort_order,
}: ApiParams & FindListSchemaEncoded): Promise<FoundListSchema> => {
  return http.fetch(`${LIST_URL}/_find`, {
    method: 'GET',
    query: {
      cursor,
      page,
      per_page,
      sort_field,
      sort_order,
    },
    signal,
    version,
  });
};

const findListsWithValidation = async ({
  cursor,
  http,
  pageIndex,
  pageSize,
  signal,
  sortField,
  sortOrder,
}: FindListsParams): Promise<FoundListSchema> =>
  pipe(
    {
      cursor: cursor != null ? cursor.toString() : undefined,
      page: pageIndex != null ? pageIndex.toString() : undefined,
      per_page: pageSize != null ? pageSize.toString() : undefined,
      sort_field: sortField != null ? sortField.toString() : undefined,
      sort_order: sortOrder,
    },
    (payload) => fromEither(validateEither(findListSchema, payload)),
    chain((payload) => tryCatch(() => findLists({ http, signal, ...payload }), toError)),
    chain((response) => fromEither(validateEither(foundListSchema, response))),
    flow(toPromise)
  );

export { findListsWithValidation as findLists };

const findListsBySize = async ({
  http,
  cursor,
  page,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  per_page,
  signal,
}: ApiParams & FindListSchemaEncoded): Promise<FoundListsBySizeSchema> => {
  return http.fetch(`${INTERNAL_FIND_LISTS_BY_SIZE}`, {
    method: 'GET',
    version: '1',
    query: {
      cursor,
      page,
      per_page,
    },
    signal,
  });
};

const findListsBySizeWithValidation = async ({
  cursor,
  http,
  pageIndex,
  pageSize,
  signal,
}: FindListsParams): Promise<FoundListsBySizeSchema> =>
  pipe(
    {
      cursor: cursor != null ? cursor.toString() : undefined,
      page: pageIndex != null ? pageIndex.toString() : undefined,
      per_page: pageSize != null ? pageSize.toString() : undefined,
    },
    (payload) => fromEither(validateEither(findListSchema, payload)),
    chain((payload) => tryCatch(() => findListsBySize({ http, signal, ...payload }), toError)),
    chain((response) => fromEither(validateEither(foundListsBySizeSchema, response))),
    flow(toPromise)
  );

export { findListsBySizeWithValidation as findListsBySize };

const importList = async ({
  file,
  http,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  list_id,
  type,
  signal,
}: ApiParams &
  ImportListItemSchemaEncoded &
  ImportListItemQuerySchemaEncoded): Promise<ListSchema> => {
  const formData = new FormData();
  formData.append('file', file as Blob);

  return http.fetch<ListSchema>(`${LIST_ITEM_URL}/_import`, {
    body: formData,
    headers: { 'Content-Type': undefined },
    method: 'POST',
    query: { list_id, type },
    signal,
    version,
  });
};

const importListWithValidation = async ({
  file,
  http,
  listId,
  type,
  signal,
}: ImportListParams): Promise<ListSchema> =>
  pipe(
    {
      list_id: listId,
      type,
    },
    (query) => fromEither(validateEither(importListItemQuerySchema, query)),
    chain((query) =>
      pipe(
        fromEither(validateEither(importListItemSchema, { file })),
        map((body) => ({ ...body, ...query }))
      )
    ),
    chain((payload) => tryCatch(() => importList({ http, signal, ...payload }), toError)),
    chain((response) => fromEither(validateEither(listSchema, response))),
    toPromise
  );

export { importListWithValidation as importList };

const deleteList = async ({
  deleteReferences = false,
  http,
  id,
  ignoreReferences = false,
  signal,
}: ApiParams & DeleteListSchemaEncoded): Promise<ListSchema> =>
  http.fetch<ListSchema>(LIST_URL, {
    method: 'DELETE',
    query: { deleteReferences, id, ignoreReferences },
    signal,
    version,
  });

const deleteListWithValidation = async ({
  deleteReferences,
  http,
  id,
  ignoreReferences,
  signal,
}: DeleteListParams): Promise<ListSchema> =>
  pipe(
    { deleteReferences, id, ignoreReferences },
    (payload) => fromEither(validateEither(deleteListSchema, payload)),
    chain((payload) => tryCatch(() => deleteList({ http, signal, ...payload }), toError)),
    chain((response) => fromEither(validateEither(listSchema, response))),
    flow(toPromise)
  );

export { deleteListWithValidation as deleteList };

const exportList = async ({
  http,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  list_id,
  signal,
}: ApiParams & ExportListItemQuerySchemaEncoded): Promise<Blob> =>
  http.fetch<Blob>(`${LIST_ITEM_URL}/_export`, {
    method: 'POST',
    query: { list_id },
    signal,
    version,
  });

const exportListWithValidation = async ({
  http,
  listId,
  signal,
}: ExportListParams): Promise<Blob> =>
  pipe(
    { list_id: listId },
    (payload) => fromEither(validateEither(exportListItemQuerySchema, payload)),
    chain((payload) => tryCatch(() => exportList({ http, signal, ...payload }), toError)),
    flow(toPromise)
  );

export { exportListWithValidation as exportList };

const readListIndex = async ({ http, signal }: ApiParams): Promise<ListItemIndexExistSchema> =>
  http.fetch<ListItemIndexExistSchema>(LIST_INDEX, {
    method: 'GET',
    signal,
    version,
  });

const readListIndexWithValidation = async ({
  http,
  signal,
}: ApiParams): Promise<ListItemIndexExistSchema> =>
  flow(
    () => tryCatch(() => readListIndex({ http, signal }), toError),
    chain((response) => fromEither(validateEither(listItemIndexExistSchema, response))),
    flow(toPromise)
  )();

export { readListIndexWithValidation as readListIndex };

// TODO add types and validation
export const readListPrivileges = async ({ http, signal }: ApiParams): Promise<unknown> =>
  http.fetch<unknown>(LIST_PRIVILEGES_URL, {
    method: 'GET',
    signal,
    version,
  });

const createListIndex = async ({ http, signal }: ApiParams): Promise<AcknowledgeSchema> =>
  http.fetch<AcknowledgeSchema>(LIST_INDEX, {
    method: 'POST',
    signal,
    version,
  });

const createListIndexWithValidation = async ({
  http,
  signal,
}: ApiParams): Promise<AcknowledgeSchema> =>
  flow(
    () => tryCatch(() => createListIndex({ http, signal }), toError),
    chain((response) => fromEither(validateEither(acknowledgeSchema, response))),
    flow(toPromise)
  )();

export { createListIndexWithValidation as createListIndex };

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

const findListItemssWithValidation = async ({
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

export { findListItemssWithValidation as findListItems };

const deleteListItem = async ({
  http,
  id,
  signal,
  refresh,
}: ApiParams & DeleteListItemSchema): Promise<ListSchema> =>
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
}: DeleteListItemParams): Promise<ListSchema> =>
  pipe(
    { id, refresh: refresh ? refresh.toString() : undefined },
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
  _version
}: ApiParams & PatchListItemSchema): Promise<ListSchema> =>
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
}: PatchListItemParams): Promise<ListSchema> =>
  pipe(
    { id, value, _version },
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
