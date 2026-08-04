import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
export declare const DataFindStepTypeId = "data.find";
export declare const ConfigSchema: z.ZodObject<{
    items: z.ZodUnknown;
}, z.core.$strip>;
export declare const InputSchema: z.ZodObject<{
    condition: z.ZodString;
    errorIfEmpty: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const OutputSchema: z.ZodObject<{
    item: z.ZodNullable<z.ZodUnknown>;
    index: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
export type DataFindStepConfigSchema = typeof ConfigSchema;
export type DataFindStepInputSchema = typeof InputSchema;
export type DataFindStepOutputSchema = typeof OutputSchema;
export declare const dataFindStepCommonDefinition: CommonStepDefinition<DataFindStepInputSchema, DataFindStepOutputSchema, DataFindStepConfigSchema>;
