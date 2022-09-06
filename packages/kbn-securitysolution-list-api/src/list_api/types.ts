/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SortFieldOrUndefined,
  SortOrderOrUndefined,
  Type,
} from '@kbn/securitysolution-io-ts-list-types';

// TODO: Replace these with kbn packaged versions once we have those available to us
// These originally came from this location below before moving them to this hacked "any" types:
// import { HttpStart, NotificationsStart } from '../../../../../src/core/public';
interface HttpStart {
  fetch: <T>(...args: any) => any;
}

export interface ApiParams {
  http: HttpStart;
  signal: AbortSignal;
}
export type ApiPayload<T extends ApiParams> = Omit<T, 'http' | 'signal'>;

export interface FindListsParams extends ApiParams {
  cursor?: string | undefined;
  pageSize: number | undefined;
  pageIndex: number | undefined;
  sortOrder?: SortOrderOrUndefined;
  sortField?: SortFieldOrUndefined;
}

export interface ImportListParams extends ApiParams {
  file: File;
  listId: string | undefined;
  type: Type | undefined;
}

export interface DeleteListParams extends ApiParams {
  deleteReferences?: boolean;
  id: string;
  ignoreReferences?: boolean;
}

export interface ExportListParams extends ApiParams {
  listId: string;
}
