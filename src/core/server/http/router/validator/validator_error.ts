/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SchemaTypeError } from '@kbn/config-schema';

/**
 * Error to return when the validation is not successful.
 * @public
 */
export class RouteValidationError extends SchemaTypeError {
  constructor(error: Error | string, path: string[] = []) {
    super(error, path);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, RouteValidationError.prototype);
  }
}
