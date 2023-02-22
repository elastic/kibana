/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
interface BaseEvent<T extends string> {
  type: T;
  contentTypeId: string;
  options?: object;
}

export interface GetItemStart extends BaseEvent<'getItemStart'> {
  contentId: string;
  options?: object;
}

export interface GetItemSuccess extends BaseEvent<'getItemSuccess'> {
  contentId: string;
  data: unknown;
}

export interface GetItemError extends BaseEvent<'getItemError'> {
  contentId: string;
  error: unknown;
}

export interface BulkGetItemStart extends BaseEvent<'bulkGetItemStart'> {
  ids: string[];
  options?: object;
}

export interface BulkGetItemSuccess extends BaseEvent<'bulkGetItemSuccess'> {
  ids: string[];
  data: unknown;
}

export interface BulkGetItemError extends BaseEvent<'bulkGetItemError'> {
  ids: string[];
  error: unknown;
  options?: object;
}

export interface CreateItemStart extends BaseEvent<'createItemStart'> {
  data: object;
  options?: object;
}

export interface CreateItemSuccess extends BaseEvent<'createItemSuccess'> {
  data: object;
  options?: object;
}

export interface CreateItemError extends BaseEvent<'createItemError'> {
  data: object;
  error: unknown;
  options?: object;
}

export interface UpdateItemStart extends BaseEvent<'updateItemStart'> {
  contentId: string;
  data: object;
  options?: object;
}

export interface UpdateItemSuccess extends BaseEvent<'updateItemSuccess'> {
  contentId: string;
  data: object;
  options?: object;
}

export interface UpdateItemError extends BaseEvent<'updateItemError'> {
  contentId: string;
  data: object;
  error: unknown;
  options?: object;
}

export interface DeleteItemStart extends BaseEvent<'deleteItemStart'> {
  contentId: string;
  options?: object;
}

export interface DeleteItemSuccess extends BaseEvent<'deleteItemSuccess'> {
  contentId: string;
  options?: object;
}

export interface DeleteItemError extends BaseEvent<'deleteItemError'> {
  contentId: string;
  error: unknown;
  options?: object;
}

export interface SearchItemStart extends BaseEvent<'searchItemStart'> {
  query: object;
  options?: object;
}

export interface SearchItemSuccess extends BaseEvent<'searchItemSuccess'> {
  query: object;
  data: unknown;
  options?: object;
}

export interface SearchItemError extends BaseEvent<'searchItemError'> {
  query: object;
  error: unknown;
  options?: object;
}

export type ContentEvent =
  | GetItemStart
  | GetItemSuccess
  | GetItemError
  | BulkGetItemStart
  | BulkGetItemSuccess
  | BulkGetItemError
  | CreateItemStart
  | CreateItemSuccess
  | CreateItemError
  | UpdateItemStart
  | UpdateItemSuccess
  | UpdateItemError
  | DeleteItemStart
  | DeleteItemSuccess
  | DeleteItemError
  | SearchItemStart
  | SearchItemSuccess
  | SearchItemError;

export type ContentEventType = ContentEvent['type'];
