/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface GetItemStart {
  type: 'getItemStart';
  contentId: string;
  contentType: string;
}

interface GetItemSuccess {
  type: 'getItemSuccess';
  contentId: string;
  contentType: string;
  data: unknown;
}

interface GetItemError {
  type: 'getItemError';
  contentId: string;
  contentType: string;
  error: unknown;
}

interface CreateItemSuccess {
  type: 'createItemSuccess';
  contentType: string;
  data: object;
}

export type ContentEvent = GetItemStart | GetItemSuccess | GetItemError | CreateItemSuccess;

export type ContentEventType = ContentEvent['type'];
