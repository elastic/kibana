import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
export declare const DataParseJsonStepTypeId: "data.parseJson";
export declare const ConfigSchema: z.ZodObject<{
    source: z.ZodUnknown;
}, z.core.$strip>;
export declare const InputSchema: z.ZodObject<{}, z.core.$strip>;
export declare const OutputSchema: z.ZodUnknown;
export type DataParseJsonStepConfigSchema = typeof ConfigSchema;
export type DataParseJsonStepInputSchema = typeof InputSchema;
export type DataParseJsonStepOutputSchema = typeof OutputSchema;
export declare const dataParseJsonStepCommonDefinition: CommonStepDefinition<DataParseJsonStepInputSchema, DataParseJsonStepOutputSchema, DataParseJsonStepConfigSchema>;
