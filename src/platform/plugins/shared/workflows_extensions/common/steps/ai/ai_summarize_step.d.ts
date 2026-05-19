import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
/**
 * Step type ID for the AI summarize step.
 */
export declare const AiSummarizeStepTypeId = "ai.summarize";
export declare const ConfigSchema: z.ZodObject<{
    'connector-id': z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Input schema for the AI summarize step.
 */
export declare const InputSchema: z.ZodObject<{
    input: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
    instructions: z.ZodOptional<z.ZodString>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    temperature: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Output schema for the AI summarize step.
 */
export declare const OutputSchema: z.ZodObject<{
    content: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export type AiSummarizeStepConfigSchema = typeof ConfigSchema;
export type AiSummarizeStepInputSchema = typeof InputSchema;
export type AiSummarizeStepOutputSchema = typeof OutputSchema;
/**
 * Common step definition for AI summarize step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export declare const AiSummarizeStepCommonDefinition: CommonStepDefinition<AiSummarizeStepInputSchema, AiSummarizeStepOutputSchema, AiSummarizeStepConfigSchema>;
