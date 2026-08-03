import type { JSONSchema7 } from 'json-schema';
import { normalizeFieldsToJsonSchema } from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
export declare const INPUT_STRING_PLACEHOLDER = "<your_input>";
/**
 * Generates a sample value from a JSON Schema.
 * Used for placeholder/sample values in forms and autocomplete when no default is set.
 *
 * @param schema - JSON Schema fragment to sample
 * @param inputsRoot - When set, `$ref` is resolved with {@link resolveRef} (local `definitions`
 *   and built-in `#/kibana/definitions/...`). Required for sampling `$ref`-only properties.
 */
export declare function generateSampleFromJsonSchema(schema: JSONSchema7, inputsRoot?: JsonModelSchemaType, depth?: number, normalizedRoot?: ReturnType<typeof normalizeFieldsToJsonSchema>): unknown;
