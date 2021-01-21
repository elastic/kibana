/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SchemaError, SchemaTypeError, SchemaTypesError } from '.';

export class ValidationError extends SchemaError {
  private static extractMessage(error: SchemaTypeError, namespace?: string, level?: number) {
    const path = typeof namespace === 'string' ? [namespace, ...error.path] : error.path;

    let message = error.message;
    if (error instanceof SchemaTypesError) {
      const indentLevel = level || 0;
      const childErrorMessages = error.errors.map((childError) =>
        ValidationError.extractMessage(childError, namespace, indentLevel + 1)
      );

      message = `${message}\n${childErrorMessages
        .map((childErrorMessage) => `${' '.repeat(indentLevel)}- ${childErrorMessage}`)
        .join('\n')}`;
    }

    if (path.length === 0) {
      return message;
    }

    return `[${path.join('.')}]: ${message}`;
  }

  constructor(error: SchemaTypeError, namespace?: string) {
    super(ValidationError.extractMessage(error, namespace), error);

    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
