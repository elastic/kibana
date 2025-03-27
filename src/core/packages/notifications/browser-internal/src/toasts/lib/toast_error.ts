/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const TOAST_ERROR_NAME = 'ToastError';

export class ToastError<T extends Error> extends Error {
  constructor(message: string, originalError: T) {
    super(message);
    this.name = TOAST_ERROR_NAME;
    if (originalError.stack) {
      this.stack = originalError.stack;
    }
  }
}
