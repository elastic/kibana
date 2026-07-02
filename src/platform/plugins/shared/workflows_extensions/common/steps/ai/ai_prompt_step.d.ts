import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
/**
 * Step type ID for the AI prompt step.
 */
export declare const AiPromptStepTypeId = "ai.prompt";
export declare const ConfigSchema: z.ZodObject<{
    'connector-id': z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const MetadataSchema: z.ZodRecord<z.ZodString, z.ZodAny>;
/**
 * Input schema for the AI prompt step.
 * Uses variables structure with key->value pairs.
 */
export declare const InputSchema: z.ZodObject<{
    prompt: z.ZodString;
    systemPrompt: z.ZodOptional<z.ZodString>;
    schema: z.ZodOptional<z.ZodType<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown, z.core.$ZodTypeInternals<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>;
    temperature: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare function getStructuredOutputSchema(contentSchema: z.ZodType): z.ZodObject<{
    content: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
    metadata: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>;
/**
 * Output schema for the AI prompt step.
 * Uses variables structure with key->value pairs.
 */
export declare const OutputSchema: z.ZodUnion<readonly [z.ZodObject<{
    content: z.ZodString;
    metadata: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>, z.ZodObject<{
    content: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
    metadata: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>]>;
export type AiPromptStepConfigSchema = typeof ConfigSchema;
export type AiPromptStepInputSchema = typeof InputSchema;
export type AiPromptStepOutputSchema = typeof OutputSchema;
/**
 * Common step definition for AI prompt step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export declare const AiPromptStepCommonDefinition: CommonStepDefinition<AiPromptStepInputSchema, AiPromptStepOutputSchema, AiPromptStepConfigSchema>;
