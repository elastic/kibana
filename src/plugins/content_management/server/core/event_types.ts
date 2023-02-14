/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface GetItemStart {
  type: 'getItemStart';
  contentId: string;
  contentTypeId: string;
  options?: object;
}

export interface GetItemSuccess {
  type: 'getItemSuccess';
  contentId: string;
  contentTypeId: string;
  data: unknown;
}

export interface GetItemError {
  type: 'getItemError';
  contentId: string;
  contentTypeId: string;
  error: unknown;
  options?: object;
}

export interface BulkGetItemStart {
  type: 'bulkGetItemStart';
  ids: string[];
  contentTypeId: string;
  options?: object;
}

export interface BulkGetItemSuccess {
  type: 'bulkGetItemSuccess';
  ids: string[];
  contentTypeId: string;
  data: unknown;
}

export interface BulkGetItemError {
  type: 'bulkGetItemError';
  ids: string[];
  contentTypeId: string;
  error: unknown;
  options?: object;
}

export interface CreateItemStart {
  type: 'createItemStart';
  contentTypeId: string;
  data: object;
  options?: object;
}

export interface CreateItemSuccess {
  type: 'createItemSuccess';
  contentTypeId: string;
  data: object;
  options?: object;
}

export interface CreateItemError {
  type: 'createItemError';
  contentTypeId: string;
  data: object;
  error: unknown;
  options?: object;
}

export interface UpdateItemStart {
  type: 'updateItemStart';
  contentId: string;
  contentTypeId: string;
  data: object;
  options?: object;
}

export interface UpdateItemSuccess {
  type: 'updateItemSuccess';
  contentId: string;
  contentTypeId: string;
  data: object;
  options?: object;
}

export interface UpdateItemError {
  type: 'updateItemError';
  contentId: string;
  contentTypeId: string;
  data: object;
  error: unknown;
  options?: object;
}

export interface DeleteItemStart {
  type: 'deleteItemStart';
  contentId: string;
  contentTypeId: string;
  options?: object;
}

export interface DeleteItemSuccess {
  type: 'deleteItemSuccess';
  contentId: string;
  contentTypeId: string;
  options?: object;
}

export interface DeleteItemError {
  type: 'deleteItemError';
  contentId: string;
  contentTypeId: string;
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
  | DeleteItemError;

export type ContentEventType = ContentEvent['type'];
