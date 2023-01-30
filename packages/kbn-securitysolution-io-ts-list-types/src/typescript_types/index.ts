/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter } from '@kbn/es-query';
import { NamespaceType } from '../common/default_namespace';
import { ExceptionListType, ExceptionListTypeEnum } from '../common/exception_list';
import { Page } from '../common/page';
import { PerPage } from '../common/per_page';
import { TotalOrUndefined } from '../common/total';
import { CreateExceptionListItemSchema } from '../request/create_exception_list_item_schema';
import { CreateExceptionListSchema } from '../request/create_exception_list_schema';
import { ExceptionListId } from '../request/get_exception_filter_schema';
import { UpdateExceptionListItemSchema } from '../request/update_exception_list_item_schema';
import { UpdateExceptionListSchema } from '../request/update_exception_list_schema';
import { ExceptionListItemSchema } from '../response/exception_list_item_schema';
import { ExceptionListSchema } from '../response/exception_list_schema';

// TODO: Replace these with kbn packaged versions once we have those available to us
// These originally came from this location below before moving them to this hacked "any" types:
// import { HttpStart, NotificationsStart } from '../../../../../src/core/public';
interface HttpStart {
  fetch: <T>(...args: any) => any;
}
type NotificationsStart = any;

export interface ExceptionListFilter {
  name?: string | null;
  list_id?: string | null;
  created_by?: string | null;
  types?: ExceptionListTypeEnum[] | null;
  tags?: string | null;
}

export interface UseExceptionListsProps {
  errorMessage: string;
  filterOptions?: ExceptionListFilter;
  http: HttpStart;
  namespaceTypes: NamespaceType[];
  notifications: NotificationsStart;
  initialPagination?: Pagination;
  hideLists?: readonly string[];
  initialSort?: Sort;
}

export interface UseExceptionListProps {
  http: HttpStart;
  lists: ExceptionListIdentifiers[];
  onError?: (arg: string[]) => void;
  filterOptions: FilterExceptionsOptions[];
  pagination?: Pagination;
  showDetectionsListsOnly: boolean;
  showEndpointListsOnly: boolean;
  matchFilters: boolean;
  onSuccess?: (arg: UseExceptionListItemsSuccess) => void;
  sort?: Sort;
}

export interface FilterExceptionsOptions {
  filter: string;
  tags: string[];
}

export interface ApiCallMemoProps {
  id: string;
  namespaceType: NamespaceType;
  onError: (arg: Error) => void;
  onSuccess: () => void;
}

// TODO: Switch to use ApiCallMemoProps
// after cleaning up exceptions/api file to
// remove unnecessary validation checks
export interface ApiListExportProps {
  id: string;
  listId: string;
  namespaceType: NamespaceType;
  onError: (err: Error) => void;
  onSuccess: (blob: Blob) => void;
}

export interface Sort {
  field: string;
  order: string;
}
export interface Pagination {
  page: Page;
  perPage: PerPage;
  total: TotalOrUndefined;
}

export interface UseExceptionListItemsSuccess {
  exceptions: ExceptionListItemSchema[];
  pagination: Pagination;
}

export interface ExceptionListIdentifiers {
  id: string;
  listId: string;
  namespaceType: NamespaceType;
  type: ExceptionListType;
}

export interface ApiCallFindListsItemsMemoProps {
  lists: ExceptionListIdentifiers[];
  pagination: Partial<Pagination>;
  showDetectionsListsOnly: boolean;
  showEndpointListsOnly: boolean;
  filter?: string;
  onError: (arg: string[]) => void;
  onSuccess: (arg: UseExceptionListItemsSuccess) => void;
}

export interface ApiCallGetExceptionFilterFromIdsMemoProps extends GetExceptionFilterOptionalProps {
  exceptionListIds: ExceptionListId[];
  onError: (arg: string[]) => void;
  onSuccess: (arg: Filter) => void;
}

export interface ApiCallGetExceptionFilterFromExceptionsMemoProps
  extends GetExceptionFilterOptionalProps {
  exceptions: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
  onError: (arg: string[]) => void;
  onSuccess: (arg: Filter) => void;
}

export interface ExportExceptionListProps {
  http: HttpStart;
  id: string;
  listId: string;
  namespaceType: NamespaceType;
  signal: AbortSignal;
}

export interface AddEndpointExceptionListProps {
  http: HttpStart;
  signal: AbortSignal;
}

export interface UpdateExceptionListItemProps {
  http: HttpStart;
  listItem: UpdateExceptionListItemSchema;
  signal: AbortSignal;
}

export interface UpdateExceptionListProps {
  http: HttpStart;
  list: UpdateExceptionListSchema;
  signal: AbortSignal;
}

export interface AddExceptionListItemProps {
  http: HttpStart;
  listItem: CreateExceptionListItemSchema;
  signal: AbortSignal;
}

export interface AddExceptionListProps {
  http: HttpStart;
  list: CreateExceptionListSchema;
  signal: AbortSignal;
}

export interface UseExceptionListsSuccess {
  exceptions: ExceptionListSchema[];
  pagination: Pagination;
}

export interface ApiCallFetchExceptionListsProps {
  http: HttpStart;
  namespaceTypes: string;
  pagination: Partial<Pagination>;
  sort?: Sort;
  filters: string;
  signal: AbortSignal;
}

export interface ApiCallByIdProps {
  http: HttpStart;
  id: string;
  namespaceType: NamespaceType;
  signal: AbortSignal;
}

export interface ApiCallByListIdProps {
  http: HttpStart;
  listIds: string[];
  namespaceTypes: NamespaceType[];
  pagination: Partial<Pagination>;
  search?: string;
  filter?: string;
  signal: AbortSignal;
}

export type AddExceptionList = UpdateExceptionListSchema | CreateExceptionListSchema;

export interface PersistHookProps {
  http: HttpStart;
  onError: (arg: Error) => void;
}

export interface ExceptionList extends ExceptionListSchema {
  totalItems: number;
}

export interface GetExceptionFilterOptionalProps {
  signal?: AbortSignal;
  chunkSize?: number;
  alias?: string;
  excludeExceptions?: boolean;
}

export interface GetExceptionFilterFromExceptionListIdsProps
  extends GetExceptionFilterOptionalProps {
  http: HttpStart;
  exceptionListIds: ExceptionListId[];
}

export interface GetExceptionFilterFromExceptionsProps extends GetExceptionFilterOptionalProps {
  http: HttpStart;
  exceptions: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
}

export interface ExceptionFilterResponse {
  filter: Filter;
}
