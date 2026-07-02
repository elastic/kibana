import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
/**
 * Step type ID for the AI classify step.
 */
export declare const AiClassifyStepTypeId = "ai.classify";
export declare const ConfigSchema: z.ZodObject<{
    'connector-id': z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Input schema for the AI classify step.
 */
export declare const InputSchema: z.ZodObject<{
    input: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
    categories: z.ZodArray<z.ZodString>;
    instructions: z.ZodOptional<z.ZodString>;
    allowMultipleCategories: z.ZodOptional<z.ZodBoolean>;
    fallbackCategory: z.ZodOptional<z.ZodString>;
    includeRationale: z.ZodOptional<z.ZodBoolean>;
    temperature: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Output schema for the AI classify step.
 * This is the base schema - the dynamic schema will be created based on input parameters.
 */
export declare const OutputSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString>>;
    rationale: z.ZodOptional<z.ZodString>;
    metadata: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>;
export type AiClassifyStepConfigSchema = typeof ConfigSchema;
export type AiClassifyStepInputSchema = typeof InputSchema;
export type AiClassifyStepOutputSchema = typeof OutputSchema;
/**
 * Common step definition for AI classify step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export declare const AiClassifyStepCommonDefinition: CommonStepDefinition<AiClassifyStepInputSchema, AiClassifyStepOutputSchema, AiClassifyStepConfigSchema>;
/**
 * Builds a dynamic Zod schema for structured output based on AI classification step inputs.
 */
export declare function buildStructuredOutputSchema(params: z.infer<AiClassifyStepInputSchema>): typeof OutputSchema;
