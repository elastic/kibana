/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NamespaceType } from '../common/default_namespace';
import { ExceptionListType } from '../common/exception_list';
import { Page } from '../common/page';
import { PerPage } from '../common/per_page';
import { TotalOrUndefined } from '../common/total';
import { CreateExceptionListItemSchema } from '../request/create_exception_list_item_schema';
import { CreateExceptionListSchema } from '../request/create_exception_list_schema';
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
  type?: string | null;
  tags?: string | null;
}

export interface UseExceptionListsProps {
  errorMessage: string;
  filterOptions?: ExceptionListFilter;
  http: HttpStart;
  namespaceTypes: NamespaceType[];
  notifications: NotificationsStart;
  initialPagination?: Pagination;
  showTrustedApps: boolean;
  showEventFilters: boolean;
  showHostIsolationExceptions: boolean;
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
  filterOptions: FilterExceptionsOptions[];
  pagination: Partial<Pagination>;
  showDetectionsListsOnly: boolean;
  showEndpointListsOnly: boolean;
  onError: (arg: string[]) => void;
  onSuccess: (arg: UseExceptionListItemsSuccess) => void;
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
  filterOptions: FilterExceptionsOptions[];
  pagination: Partial<Pagination>;
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
