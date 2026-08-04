import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
export declare const DataStringifyJsonStepTypeId: "data.stringifyJson";
export declare const ConfigSchema: z.ZodObject<{
    source: z.ZodUnknown;
}, z.core.$strip>;
export declare const InputSchema: z.ZodObject<{
    pretty: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const OutputSchema: z.ZodString;
export type DataStringifyJsonStepConfigSchema = typeof ConfigSchema;
export type DataStringifyJsonStepInputSchema = typeof InputSchema;
export type DataStringifyJsonStepOutputSchema = typeof OutputSchema;
export declare const dataStringifyJsonStepCommonDefinition: CommonStepDefinition<DataStringifyJsonStepInputSchema, DataStringifyJsonStepOutputSchema, DataStringifyJsonStepConfigSchema>;
