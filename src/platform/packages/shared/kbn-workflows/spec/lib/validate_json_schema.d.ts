import type { JSONSchema7 } from 'json-schema';
/**
 * Validates if the provided value is a valid JSON Schema (Draft 7)
 * @param schema - The value to validate
 * @returns true if the schema is valid, false otherwise
 */
export declare function isValidJsonSchema(schema: unknown): schema is JSONSchema7;
