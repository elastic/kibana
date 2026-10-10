/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Thrown for JSONPath expressions that are malformed or use syntax this subset doesn't support. */
export class JsonPathError extends Error {
  constructor(path: string, offset: number, problem: string) {
    super(`${problem} at offset ${offset} in JSONPath ${path}`);
    this.name = 'JsonPathError';
  }
}
