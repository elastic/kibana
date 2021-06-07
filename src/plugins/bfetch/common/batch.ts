/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ErrorLike {
  message: string;
}

export interface BatchRequestData<Item> {
  batch: Item[];
}

export interface BatchResponseItem<Result extends object, Error extends ErrorLike = ErrorLike> {
  id: number;
  result?: Result;
  error?: Error;
}

export interface BatchItemWrapper {
  compressed: boolean;
  payload: string;
}
