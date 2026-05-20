import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
export declare const DataRegexExtractStepTypeId: "data.regexExtract";
export declare const ConfigSchema: z.ZodObject<{
    source: z.ZodUnknown;
    errorIfNoMatch: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const InputSchema: z.ZodObject<{
    pattern: z.ZodString;
    fields: z.ZodRecord<z.ZodString, z.ZodString>;
    flags: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const OutputSchema: z.ZodUnion<readonly [z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodUnion<readonly [z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodNull]>>, z.ZodNull]>;
export type DataRegexExtractStepConfigSchema = typeof ConfigSchema;
export type DataRegexExtractStepInputSchema = typeof InputSchema;
export type DataRegexExtractStepOutputSchema = typeof OutputSchema;
export declare const dataRegexExtractStepCommonDefinition: CommonStepDefinition<DataRegexExtractStepInputSchema, DataRegexExtractStepOutputSchema, DataRegexExtractStepConfigSchema>;
