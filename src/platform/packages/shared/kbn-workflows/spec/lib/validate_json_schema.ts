/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Ajv from 'ajv/dist/2020';
import type { JSONSchema7 } from 'json-schema';

// Meta-schema for JSON Schema Draft 7
// Enable format validation to support email, uri, date-time, etc.
const ajv = new Ajv({
  strict: false,
  allErrors: true,
  validateFormats: true, // Enable format validation for email, uri, date-time, etc.
});

/**
 * Validates if the provided value is a valid JSON Schema (Draft 7)
 * @param schema - The value to validate
 * @returns true if the schema is valid, false otherwise
 */
export function isValidJsonSchema(schema: unknown): schema is JSONSchema7 {
  if (typeof schema !== 'object' || schema === null) {
    return false;
  }

  // Basic structural validation
  const schemaObj = schema as Record<string, unknown>;

  // Must have a type property (or be a valid schema structure)
  // JSON Schema can have: type, $ref, allOf, anyOf, oneOf, not, const, enum, etc.
  // For simplicity, we check for common JSON Schema properties
  const hasValidStructure =
    'type' in schemaObj ||
    '$ref' in schemaObj ||
    'allOf' in schemaObj ||
    'anyOf' in schemaObj ||
    'oneOf' in schemaObj ||
    'not' in schemaObj ||
    'const' in schemaObj ||
    'enum' in schemaObj;

  if (!hasValidStructure) {
    return false;
  }

  // Try to compile the schema to ensure it's valid
  try {
    // Suppress console errors from Ajv compilation
    // Ajv may log errors for very large/complex schemas (like meta-schemas)
    // but these are expected and don't affect functionality
    // eslint-disable-next-line no-console
    const originalConsoleError = console.error;
    // eslint-disable-next-line no-console
    const originalConsoleWarn = console.warn;
    // eslint-disable-next-line no-console
    console.error = () => {};
    // eslint-disable-next-line no-console
    console.warn = () => {};
    try {
      ajv.compile(schemaObj);
      return true;
    } finally {
      // eslint-disable-next-line no-console
      console.error = originalConsoleError;
      // eslint-disable-next-line no-console
      console.warn = originalConsoleWarn;
    }
  } catch (error) {
    // If compilation fails, it's not a valid schema
    // Suppress console errors for very large/complex schemas that might fail compilation
    // but are still structurally valid JSON Schema
    // The error is expected for some complex nested schemas and doesn't affect functionality
    return false;
  }
}
