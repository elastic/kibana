/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
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

interface BaseParams {
  http: HttpStart;
  signal: AbortSignal;
}

export interface AddExceptionListProps extends BaseParams {
  list: CreateExceptionListSchema;
}

export interface AddExceptionListItemProps extends BaseParams {
  listItem: CreateExceptionListItemSchema;
}

export interface UpdateExceptionListProps extends BaseParams {
  list: UpdateExceptionListSchema;
}

export interface UpdateExceptionListItemProps extends BaseParams {
  listItem: UpdateExceptionListItemSchema;
}

export interface FetchExceptionListsProps extends BaseParams {
  namespaceTypes: string;
  pagination: Partial<Pagination>;
  sort?: Sort;
  filters: string;
}

export interface CRUDExceptionListByIdProps extends BaseParams {
  id: string;
  namespaceType: NamespaceType;
}

export interface DuplicateExceptionListProps extends BaseParams {
  listId: string;
  namespaceType: NamespaceType;
  includeExpiredExceptions: boolean;
}

export interface ApiListDuplicateProps
  extends Omit<DuplicateExceptionListProps, 'http' | 'signal'> {
  onError: (err: Error) => void;
  onSuccess: () => void;
}

export interface ExportExceptionListProps extends BaseParams {
  id: string;
  listId: string;
  namespaceType: NamespaceType;
  includeExpiredExceptions: boolean;
}

export interface ApiListExportProps extends Omit<ExportExceptionListProps, 'http' | 'signal'> {
  onError: (err: Error) => void;
  onSuccess: (blob: Blob) => void;
}

export type AddEndpointExceptionListProps = BaseParams;

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

export interface UseExceptionListsSuccess {
  exceptions: ExceptionListSchema[];
  pagination: Pagination;
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
