import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
export declare const DataConcatStepTypeId: "data.concat";
export declare const ConfigSchema: z.ZodObject<{
    arrays: z.ZodArray<z.ZodUnknown>;
}, z.core.$strip>;
export declare const InputSchema: z.ZodObject<{
    dedupe: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    flatten: z.ZodDefault<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodNumber]>>>;
}, z.core.$strip>;
export declare const OutputSchema: z.ZodArray<z.ZodUnknown>;
export type DataConcatStepConfigSchema = typeof ConfigSchema;
export type DataConcatStepInputSchema = typeof InputSchema;
export type DataConcatStepOutputSchema = typeof OutputSchema;
export declare const dataConcatStepCommonDefinition: CommonStepDefinition<DataConcatStepInputSchema, DataConcatStepOutputSchema, DataConcatStepConfigSchema>;
