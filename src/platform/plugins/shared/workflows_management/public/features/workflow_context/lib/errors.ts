/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export class InvalidForeachParameterError extends Error {
  public code: InvalidForeachParameterErrorCodes;
  constructor(message: string, code: InvalidForeachParameterErrorCodes) {
    super(message);
    this.name = 'InvalidForeachParameterError';
    this.code = code;
  }
}

export enum InvalidForeachParameterErrorCodes {
  INVALID_JSON = 'INVALID_JSON',
  INVALID_VARIABLE_PATH = 'INVALID_VARIABLE_PATH',
  INVALID_TYPE = 'INVALID_TYPE',
  INVALID_UNION = 'INVALID_UNION',
  INVALID_LITERAL = 'INVALID_LITERAL',
  INVALID_ARRAY = 'INVALID_ARRAY',
}
