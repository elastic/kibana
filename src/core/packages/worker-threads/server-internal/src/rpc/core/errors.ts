/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 eslint-disable max-classes-per-file
 */

export class MethodNotAvailableInWorkerThreadContextError extends Error {
  constructor(name: string) {
    super(`Method ${name} not available in worker threads`);
    this.name = `MethodNotAvailableInWorkerThreadContextError`;
  }
}

export class MethodNotCallableInWorkerThreadContextError extends Error {
  constructor(name: string) {
    super(`Method ${name} not callable`);
    this.name = `MethodNotCallableInWorkerThreadContextError`;
  }
}
