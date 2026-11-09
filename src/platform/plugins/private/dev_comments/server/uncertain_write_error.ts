/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** A comment's write that Elasticsearch did not answer, twice: the comment may or may not be stored. */
export class UncertainWriteError extends Error {
  constructor(id: string, cause: unknown) {
    super(`Whether comment ${id} was stored is unknown: Elasticsearch did not answer.`, {
      cause,
    });
    this.name = 'UncertainWriteError';
  }
}
