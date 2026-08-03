import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
export declare const DataDedupeStepTypeId: "data.dedupe";
export declare const ConfigSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodUnknown>;
    strategy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        keep_first: "keep_first";
        keep_last: "keep_last";
    }>>>;
}, z.core.$strip>;
export declare const InputSchema: z.ZodObject<{
    keys: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const OutputSchema: z.ZodArray<z.ZodUnknown>;
export type DataDedupeStepConfigSchema = typeof ConfigSchema;
export type DataDedupeStepInputSchema = typeof InputSchema;
export type DataDedupeStepOutputSchema = typeof OutputSchema;
export declare const dataDedupeStepCommonDefinition: CommonStepDefinition<DataDedupeStepInputSchema, DataDedupeStepOutputSchema, DataDedupeStepConfigSchema>;
