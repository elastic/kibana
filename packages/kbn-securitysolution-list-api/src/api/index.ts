/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CreateEndpointListSchema,
  ExceptionListItemSchema,
  ExceptionListSchema,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
  AddEndpointExceptionListProps,
  AddExceptionListItemProps,
  AddExceptionListProps,
  CRUDExceptionListByIdProps,
  ApiCallByListIdProps,
  FetchExceptionListsProps,
  ExportExceptionListProps,
  UpdateExceptionListItemProps,
  UpdateExceptionListProps,
  GetExceptionFilterFromExceptionListIdsProps,
  GetExceptionFilterFromExceptionsProps,
  ExceptionFilterResponse,
  DuplicateExceptionListProps,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  ENDPOINT_LIST_URL,
  EXCEPTION_FILTER,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';

/**
 * Add new ExceptionList
 *
 * @param http Kibana http service
 * @param list exception list to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
export const addExceptionList = async ({
  http,
  list,
  signal,
}: AddExceptionListProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
    body: JSON.stringify(list),
    method: 'POST',
    signal,
  });

/**
 * Add new ExceptionListItem
 *
 * @param http Kibana http service
 * @param listItem exception list item to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
export const addExceptionListItem = async ({
  http,
  listItem,
  signal,
}: AddExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    body: JSON.stringify(listItem),
    method: 'POST',
    signal,
  });

/**
 * Update existing ExceptionList
 *
 * @param http Kibana http service
 * @param list exception list to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
export const updateExceptionList = async ({
  http,
  list,
  signal,
}: UpdateExceptionListProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
    body: JSON.stringify(list),
    method: 'PUT',
    signal,
  });

/**
 * Update existing ExceptionListItem
 *
 * @param http Kibana http service
 * @param listItem exception list item to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
export const updateExceptionListItem = async ({
  http,
  listItem,
  signal,
}: UpdateExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    body: JSON.stringify(listItem),
    method: 'PUT',
    signal,
  });

/**
 * Fetch all ExceptionLists (optionally by namespaceType)
 *
 * @param http Kibana http service
 * @param namespaceTypes ExceptionList namespace_types of lists to find
 * @param filters search bar filters
 * @param pagination optional
 * @param signal to cancel request
 *
 * @throws An error if request params or response is not OK
 */
export const fetchExceptionLists = async ({
  http,
  filters,
  namespaceTypes,
  pagination,
  signal,
  sort,
}: FetchExceptionListsProps): Promise<FoundExceptionListSchema> => {
  const query = {
    filter: filters || undefined,
    namespace_type: namespaceTypes,
    page: pagination.page ? `${pagination.page}` : '1',
    per_page: pagination.perPage ? `${pagination.perPage}` : '20',
    sort_field: sort?.field ? sort?.field : 'exception-list.created_at',
    sort_order: sort?.order ? sort?.order : 'desc',
  };

  return http.fetch<FoundExceptionListSchema>(`${EXCEPTION_LIST_URL}/_find`, {
    method: 'GET',
    query,
    signal,
  });
};

/**
 * Fetch an ExceptionList by providing a ExceptionList ID
 *
 * @param http Kibana http service
 * @param id ExceptionList ID (not list_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListById = async ({
  http,
  id,
  namespaceType,
  signal,
}: CRUDExceptionListByIdProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
    method: 'GET',
    query: { id, namespace_type: namespaceType },
    signal,
  });

/**
 * Fetch an ExceptionList's ExceptionItems by providing a ExceptionList list_id
 *
 * @param http Kibana http service
 * @param listIds ExceptionList list_ids (not ID)
 * @param namespaceTypes ExceptionList namespace_types
 * @param search optional - simple search string
 * @param filter optional
 * @param pagination optional
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListsItemsByListIds = async ({
  http,
  listIds,
  namespaceTypes,
  filter,
  pagination,
  search,
  signal,
}: ApiCallByListIdProps): Promise<FoundExceptionListItemSchema> => {
  const query = {
    list_id: listIds.join(','),
    namespace_type: namespaceTypes.join(','),
    page: pagination.page ? `${pagination.page}` : '1',
    per_page: pagination.perPage ? `${pagination.perPage}` : '20',
    search,
    sort_field: 'exception-list.created_at',
    sort_order: 'desc',
    filter,
  };

  return http.fetch<FoundExceptionListItemSchema>(`${EXCEPTION_LIST_ITEM_URL}/_find`, {
    method: 'GET',
    query,
    signal,
  });
};

/**
 * Fetch an ExceptionListItem by providing a ExceptionListItem ID
 *
 * @param http Kibana http service
 * @param id ExceptionListItem ID (not item_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListItemById = async ({
  http,
  id,
  namespaceType,
  signal,
}: CRUDExceptionListByIdProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    method: 'GET',
    query: { id, namespace_type: namespaceType },
    signal,
  });

/**
 * Delete an ExceptionList by providing a ExceptionList ID
 *
 * @param http Kibana http service
 * @param id ExceptionList ID (not list_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const deleteExceptionListById = async ({
  http,
  id,
  namespaceType,
  signal,
}: CRUDExceptionListByIdProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
    method: 'DELETE',
    query: { id, namespace_type: namespaceType },
    signal,
  });

/**
 * Delete an ExceptionListItem by providing a ExceptionListItem ID
 *
 * @param http Kibana http service
 * @param id ExceptionListItem ID (not item_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const deleteExceptionListItemById = async ({
  http,
  id,
  namespaceType,
  signal,
}: CRUDExceptionListByIdProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    method: 'DELETE',
    query: { id, namespace_type: namespaceType },
    signal,
  });

/**
 * Add new Endpoint ExceptionList
 *
 * @param http Kibana http service
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
export const addEndpointExceptionList = async ({
  http,
  signal,
}: AddEndpointExceptionListProps): Promise<CreateEndpointListSchema> =>
  http.fetch<ExceptionListItemSchema>(ENDPOINT_LIST_URL, {
    method: 'POST',
    signal,
  });

/**
 * Duplicate an ExceptionList and its items by providing a ExceptionList list_id
 *
 * @param http Kibana http service
 * @param includeExpiredExceptions boolean for including expired exceptions
 * @param listId ExceptionList LIST_ID (not id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const duplicateExceptionList = async ({
  http,
  includeExpiredExceptions,
  listId,
  namespaceType,
  signal,
}: DuplicateExceptionListProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(`${EXCEPTION_LIST_URL}/_duplicate`, {
    method: 'POST',
    query: {
      list_id: listId,
      namespace_type: namespaceType,
      include_expired_exceptions: includeExpiredExceptions,
    },
    signal,
  });

/**
 * Export an ExceptionList by providing a ExceptionList ID
 *
 * @param http Kibana http service
 * @param id ExceptionList ID (not list_id)
 * @param includeExpiredExceptions boolean for including expired exceptions
 * @param listId ExceptionList LIST_ID (not id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const exportExceptionList = async ({
  http,
  id,
  includeExpiredExceptions,
  listId,
  namespaceType,
  signal,
}: ExportExceptionListProps): Promise<Blob> =>
  http.fetch<Blob>(`${EXCEPTION_LIST_URL}/_export`, {
    method: 'POST',
    query: {
      id,
      list_id: listId,
      namespace_type: namespaceType,
      include_expired_exceptions: includeExpiredExceptions,
    },
    signal,
  });

/**
 * Create a Filter query from an exception list id
 *
 * @param exceptionListId The id of the exception list from which create a Filter query
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getExceptionFilterFromExceptionListIds = async ({
  alias,
  chunkSize,
  exceptionListIds,
  excludeExceptions,
  http,
  signal,
}: GetExceptionFilterFromExceptionListIdsProps): Promise<ExceptionFilterResponse> =>
  http.fetch(EXCEPTION_FILTER, {
    method: 'POST',
    body: JSON.stringify({
      exception_list_ids: exceptionListIds,
      type: 'exception_list_ids',
      alias,
      exclude_exceptions: excludeExceptions,
      chunk_size: chunkSize,
    }),
    signal,
  });

/**
 * Create a Filter query from a list of exceptions
 *
 * @param exceptions Exception items to be made into a `Filter` query
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getExceptionFilterFromExceptions = async ({
  exceptions,
  alias,
  excludeExceptions,
  http,
  chunkSize,
  signal,
}: GetExceptionFilterFromExceptionsProps): Promise<ExceptionFilterResponse> =>
  http.fetch(EXCEPTION_FILTER, {
    method: 'POST',
    body: JSON.stringify({
      exceptions,
      type: 'exception_items',
      alias,
      exclude_exceptions: excludeExceptions,
      chunk_size: chunkSize,
    }),
    signal,
  });
