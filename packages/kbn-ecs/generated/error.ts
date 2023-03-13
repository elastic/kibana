/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * These fields can represent errors of any kind.
 * Use them for errors that happen while fetching events or in cases where the event itself contains an error.
 */
export interface EcsError {
  /**
   * Error code describing the error.
   */
  code?: string;
  /**
   * Unique identifier for the error.
   */
  id?: string;
  /**
   * Error message.
   */
  message?: string;
  /**
   * The stack trace of this error in plain text.
   */
  stack_trace?: string;
  /**
   * The type of the error, for example the class name of the exception.
   */
  type?: string;
}
