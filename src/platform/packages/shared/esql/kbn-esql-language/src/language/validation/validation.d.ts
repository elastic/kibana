/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ValidationOptions, ValidationResult } from './types';
/**
 * ES|QL validation public API
 * It takes a query string and returns a list of messages (errors and warnings) after validate
 * The astProvider is optional, but if not provided the default one will be used.
 * This is useful for async loading the ES|QL parser and reduce the bundle size, or to swap grammar version.
 * As for the callbacks, while optional, the validation function will selectively ignore some errors types based on each callback missing.
 *
 * @param queryString - The query string to validate
 * @param callbacks - Optional callbacks for resource retrieval.
 * @param options.invalidateColumnsCache - Invalidates the columns metadata cache before validation. Has no effect if 'getColumnsFor' callback is not provided.
 *
 */
export declare function validateQuery(
  queryString: string,
  callbacks?: ESQLCallbacks,
  options?: ValidationOptions
): Promise<ValidationResult>;
