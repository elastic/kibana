/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NormalizedReferenceObject } from '../../openapi_types';

/**
 * Check if an object has a $ref property
 *
 * @param obj Any object
 * @returns True if the object has a $ref property
 */
export function hasRef(obj: unknown): obj is NormalizedReferenceObject {
  return typeof obj === 'object' && obj !== null && '$ref' in obj;
}
