import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
export declare const DataRegexReplaceStepTypeId: "data.regexReplace";
export declare const ConfigSchema: z.ZodObject<{
    source: z.ZodUnknown;
    detailed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const InputSchema: z.ZodObject<{
    pattern: z.ZodString;
    replacement: z.ZodString;
    flags: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const OutputSchema: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodObject<{
    original: z.ZodUnknown;
    replaced: z.ZodUnknown;
    matchCount: z.ZodNumber;
}, z.core.$strip>]>;
export type DataRegexReplaceStepConfigSchema = typeof ConfigSchema;
export type DataRegexReplaceStepInputSchema = typeof InputSchema;
export type DataRegexReplaceStepOutputSchema = typeof OutputSchema;
export declare const dataRegexReplaceStepCommonDefinition: CommonStepDefinition<DataRegexReplaceStepInputSchema, DataRegexReplaceStepOutputSchema, DataRegexReplaceStepConfigSchema>;
