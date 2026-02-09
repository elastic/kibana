/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import { JsonModelShapeSchema } from './json_model_shape_schema';
import { isValidJsonSchema } from '../../lib/validate_json_schema';

// JSON Schema model structure
// This represents a JSON Schema object with properties, required, additionalProperties, and definitions.
// While currently used for workflow inputs, this schema is general-purpose and can be reused for other
// structured data models.
export const JsonModelSchema = JsonModelShapeSchema.refine(
  (data) => {
    // Validate that properties is a valid JSON Schema object
    if (data.properties) {
      // Validate each property is a valid JSON Schema
      for (const value of Object.values(data.properties)) {
        // $ref objects are valid JSON Schema but can't be validated in isolation
        // since they reference definitions that exist in the parent schema
        if (typeof value === 'object' && value !== null && '$ref' in value) {
          // $ref is a valid JSON Schema construct, skip validation
          // eslint-disable-next-line no-continue
          continue;
        }
        if (!isValidJsonSchema(value)) {
          return false;
        }
      }
    }
    return true;
  },
  { message: 'properties must contain valid JSON Schema definitions' }
).refine(
  (data) => {
    // Validate that required fields exist in properties
    if (data.required && data.properties) {
      for (const field of data.required) {
        if (!(field in data.properties)) {
          return false;
        }
      }
    }
    return true;
  },
  { message: 'required fields must exist in properties' }
);
export type JsonModelSchemaType = z.infer<typeof JsonModelSchema>;
