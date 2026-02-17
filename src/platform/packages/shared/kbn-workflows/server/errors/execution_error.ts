/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedError } from '../../spec/schema';

export class ExecutionError extends Error {
  public readonly type: string;
  public readonly details?: Record<string, unknown>;

  constructor(params: SerializedError) {
    super(params.message);
    this.type = params.type;
    this.details = params.details;
  }

  /**
   * Creates an instance of ExecutionError from a standard Error.
   * @param error The standard Error to convert.
   * @returns An instance of ExecutionError.
   */
  public static fromError(error: Error): ExecutionError {
    if (error instanceof ExecutionError) {
      return error;
    }

    return new ExecutionError({
      type: error.name || 'Error',
      message: error.message,
    });
  }

  public toSerializableObject(): SerializedError {
    const baseError: SerializedError = {
      type: this.type,
      message: this.message,
    };

    if (this.details) {
      baseError.details = this.details;
    }

    return baseError;
  }
}
