import type { JsonModelSchemaType } from '../schema/common/json_model_schema';
/**
 * Temporary backward compatibility for consumers that import from input_conversion
 * (e.g. agent_builder). Delegates to normalizeFieldsToJsonSchema so no code changes
 * are required in those plugins. Accepts unknown to avoid casts at call sites.
 *
 * @param inputs - The inputs to normalize (legacy array or JSON Schema object)
 * @returns The inputs in JSON Schema object format, or undefined
 */
export declare function normalizeInputsToJsonSchema(inputs?: unknown): JsonModelSchemaType | undefined;
