/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface BaseEvent<T extends string, Options = object> {
  type: T;
  contentTypeId: string;
  options?: Options;
}

export interface GetItemStart extends BaseEvent<'getItemStart'> {
  contentId: string;
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
}

export interface BulkGetItemSuccess extends BaseEvent<'bulkGetItemSuccess'> {
  ids: string[];
  data: unknown;
}

export interface BulkGetItemError extends BaseEvent<'bulkGetItemError'> {
  ids: string[];
  error: unknown;
}

export interface CreateItemStart extends BaseEvent<'createItemStart'> {
  data: object;
}

export interface CreateItemSuccess extends BaseEvent<'createItemSuccess'> {
  data: object;
}

export interface CreateItemError extends BaseEvent<'createItemError'> {
  data: object;
  error: unknown;
}

export interface UpdateItemStart extends BaseEvent<'updateItemStart'> {
  contentId: string;
  data: object;
}

export interface UpdateItemSuccess extends BaseEvent<'updateItemSuccess'> {
  contentId: string;
  data: object;
}

export interface UpdateItemError extends BaseEvent<'updateItemError'> {
  contentId: string;
  data: object;
  error: unknown;
}

export interface DeleteItemStart extends BaseEvent<'deleteItemStart'> {
  contentId: string;
}

export interface DeleteItemSuccess extends BaseEvent<'deleteItemSuccess'> {
  contentId: string;
}

export interface DeleteItemError extends BaseEvent<'deleteItemError'> {
  contentId: string;
  error: unknown;
}

export interface SearchItemStart extends BaseEvent<'searchItemStart'> {
  query: object;
}

export interface SearchItemSuccess extends BaseEvent<'searchItemSuccess'> {
  query: object;
  data: unknown;
}

export interface SearchItemError extends BaseEvent<'searchItemError'> {
  query: object;
  error: unknown;
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
