/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentCrud } from '../core/crud';

type CrudGetParameters<T = unknown> = Parameters<ContentCrud<T>['get']>;
export type GetParameters<T = unknown> = [CrudGetParameters<T>[1], CrudGetParameters<T>[2]?];

type CrudBulkGetParameters<T = unknown> = Parameters<ContentCrud<T>['bulkGet']>;
export type BulkGetParameters<T = unknown> = [
  CrudBulkGetParameters<T>[1],
  CrudBulkGetParameters<T>[2]?
];

type CrudCreateParameters<T = unknown> = Parameters<ContentCrud<T>['create']>;
export type CreateParameters<T = unknown> = [
  CrudCreateParameters<T>[1],
  CrudCreateParameters<T>[2]?
];

type CrudUpdateParameters<T = unknown> = Parameters<ContentCrud<T>['update']>;
export type UpdateParameters<T = unknown> = [
  CrudUpdateParameters<T>[1],
  CrudUpdateParameters<T>[2],
  CrudUpdateParameters<T>[3]?
];

type CrudDeleteParameters<T = unknown> = Parameters<ContentCrud<T>['delete']>;
export type DeleteParameters<T = unknown> = [
  CrudDeleteParameters<T>[1],
  CrudDeleteParameters<T>[2]?
];

type CrudSearchParameters<T = unknown> = Parameters<ContentCrud<T>['search']>;
export type SearchParameters<T = unknown> = [
  CrudSearchParameters<T>[1],
  CrudSearchParameters<T>[2]?
];

export interface IContentClient<T = unknown> {
  contentTypeId: string;
  get(...params: GetParameters): ReturnType<ContentCrud<T>['get']>;
  bulkGet(...params: BulkGetParameters): ReturnType<ContentCrud<T>['bulkGet']>;
  create(...params: CreateParameters): ReturnType<ContentCrud<T>['create']>;
  update(...params: UpdateParameters): ReturnType<ContentCrud<T>['update']>;
  delete(...params: DeleteParameters): ReturnType<ContentCrud<T>['delete']>;
  search(...params: SearchParameters): ReturnType<ContentCrud<T>['search']>;
}
