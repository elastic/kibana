/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

export class ErrorIndexPatternNotFound extends Error {
  public readonly is404 = true;

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ErrorIndexPatternNotFound.prototype);
  }
}

export class ErrorIndexPatternFieldNotFound extends ErrorIndexPatternNotFound {
  constructor(indexPatternId: string, fieldName: string) {
    super(`Field [index_pattern = ${indexPatternId}, field = ${fieldName}] not found.`);
  }
}
