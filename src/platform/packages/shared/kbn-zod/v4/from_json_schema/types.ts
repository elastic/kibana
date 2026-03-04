/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * JSON Schema representation.
 *
 * This interface covers the subset of JSON Schema features used by Zod v4.
 * It intentionally omits advanced features like $ref, allOf, if/then/else that are not used.
 */
export interface JsonSchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: 'uri' | 'email' | 'uuid' | 'date-time' | 'date' | 'time' | string;

  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;

  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;

  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];

  enum?: (string | number | boolean | null)[];
  const?: string | number | boolean | null;

  default?: unknown;

  title?: string;
  description?: string;

  [key: string]: unknown;
}
