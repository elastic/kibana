/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SavedObject } from '@kbn/core-saved-objects-server';

export type SavedObjectCommon<T = unknown> = SavedObject<T>;

export interface FindQueryHTTP {
  perPage?: number;
  page?: number;
  type: string | string[];
  search?: string;
  searchFields?: string[];
  defaultSearchOperator?: 'AND' | 'OR';
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  fields?: string | string[];
  hasReference?: string;
}

export interface FinderAttributes {
  title?: string;
  name?: string;
  type: string;
}

export interface FindResponseHTTP<T> {
  saved_objects: Array<SavedObjectCommon<T>>;
  total: number;
  page: number;
  per_page: number;
}
