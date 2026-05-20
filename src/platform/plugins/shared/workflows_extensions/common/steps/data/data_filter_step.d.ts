import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
export declare const DataFilterStepTypeId = "data.filter";
export declare const ConfigSchema: z.ZodObject<{
    items: z.ZodUnknown;
}, z.core.$strip>;
export declare const InputSchema: z.ZodObject<{
    condition: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const OutputSchema: z.ZodArray<z.ZodUnknown>;
export type DataFilterStepConfigSchema = typeof ConfigSchema;
export type DataFilterStepInputSchema = typeof InputSchema;
export type DataFilterStepOutputSchema = typeof OutputSchema;
export declare const dataFilterStepCommonDefinition: CommonStepDefinition<DataFilterStepInputSchema, DataFilterStepOutputSchema, DataFilterStepConfigSchema>;
