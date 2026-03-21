import type { JSONSchema7 } from 'json-schema';
import type { z } from '@kbn/zod/v4';
import type { LegacyWorkflowInput, WorkflowInputSchema, WorkflowOutput } from '../schema';
import type { JsonModelSchemaType } from '../schema/common/json_model_schema';
export type NormalizableFieldSchema = JsonModelSchemaType | Array<LegacyWorkflowInput | WorkflowOutput>;
/**
 * Converts legacy array-based field format to the new JSON Schema object format
 * @param legacyFields - Array of legacy field definitions (inputs or outputs)
 * @returns The fields in the new JSON Schema object format
 */
export declare function convertLegacyFieldsToJsonSchema(legacyFields: Array<z.infer<typeof WorkflowInputSchema>>): JsonModelSchemaType;
/**
 * Normalizes workflow fields (inputs or outputs) to the JSON Schema object format.
 * If fields are already in JSON Schema format, returns them as-is.
 * If fields are in the legacy array format, converts them.
 * Accepts unknown to avoid explicit casts at call sites (runtime checks handle validation).
 */
export declare function normalizeFieldsToJsonSchema(fields?: NormalizableFieldSchema | unknown): JsonModelSchemaType | undefined;
/**
 * Resolves a $ref reference within the inputs schema context
 * @param ref - The $ref string (e.g., "#/definitions/UserSchema")
 * @param inputsSchema - The full inputs schema containing definitions
 * @returns The resolved schema, or null if not found
 */
export declare function resolveRef(ref: string, inputsSchema: ReturnType<typeof normalizeFieldsToJsonSchema>): JSONSchema7 | null;
/**
 * Applies default values from JSON Schema to workflow inputs
 * @param inputs - The actual input values provided (may be partial or undefined)
 * @param inputsSchema - The normalized JSON Schema inputs definition
 * @returns The inputs with defaults applied
 */
export declare function applyInputDefaults(inputs: Record<string, unknown> | undefined, inputsSchema: ReturnType<typeof normalizeFieldsToJsonSchema>): Record<string, unknown> | undefined;
