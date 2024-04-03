/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import { NormalizedReferenceObject } from '../openapi_types';
import { traverseObject } from './traverse_object';

/**
 * Check if an object has a $ref property
 *
 * @param obj Any object
 * @returns True if the object has a $ref property
 */
const hasRef = (obj: unknown): obj is NormalizedReferenceObject => {
  return typeof obj === 'object' && obj !== null && '$ref' in obj;
};

export function normalizeSchema(schema: OpenAPIV3.Document) {
  traverseObject(schema, (element) => {
    if (hasRef(element)) {
      const referenceName = element.$ref.split('/').pop();
      if (!referenceName) {
        throw new Error(`Cannot parse reference name: ${element.$ref}`);
      }

      element.referenceName = referenceName;
    }
  });

  return schema;
}
