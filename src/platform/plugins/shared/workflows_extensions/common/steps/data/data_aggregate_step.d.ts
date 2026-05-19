import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
export declare const DataAggregateStepTypeId: "data.aggregate";
export declare const ConfigSchema: z.ZodObject<{
    items: z.ZodUnknown;
}, z.core.$strip>;
export declare const InputSchema: z.ZodObject<{
    group_by: z.ZodArray<z.ZodString>;
    metrics: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        operation: z.ZodEnum<{
            count: "count";
            min: "min";
            max: "max";
            avg: "avg";
            sum: "sum";
        }>;
        field: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    buckets: z.ZodOptional<z.ZodObject<{
        field: z.ZodString;
        ranges: z.ZodArray<z.ZodObject<{
            from: z.ZodOptional<z.ZodNumber>;
            to: z.ZodOptional<z.ZodNumber>;
            label: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    order_by: z.ZodOptional<z.ZodString>;
    order: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const OutputSchema: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
export type DataAggregateStepConfigSchema = typeof ConfigSchema;
export type DataAggregateStepInputSchema = typeof InputSchema;
export type DataAggregateStepOutputSchema = typeof OutputSchema;
export declare const dataAggregateStepCommonDefinition: CommonStepDefinition<DataAggregateStepInputSchema, DataAggregateStepOutputSchema, DataAggregateStepConfigSchema>;
