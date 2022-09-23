/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Custom error to report the error message with an additional error code.
 */
export class ErrorWithCode extends Error {
  /**
   * Constructor of the error.
   * @param message The error message.
   * @param code The code of the error.
   */
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}
