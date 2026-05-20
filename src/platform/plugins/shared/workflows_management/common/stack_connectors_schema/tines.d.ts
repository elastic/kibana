/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/tines/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import { z } from '@kbn/zod/v4';
export declare const TinesStoriesParamsSchema: z.ZodObject<{}, z.core.$strip>;
export declare const TinesWebhooksParamsSchema: z.ZodObject<{}, z.core.$strip>;
export declare const TinesRunParamsSchema: z.ZodObject<{
    webhook: z.ZodObject<{
        url: z.ZodString;
        body: z.ZodOptional<z.ZodString>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const TinesTestParamsSchema: z.ZodObject<{
    webhook: z.ZodObject<{
        url: z.ZodString;
        body: z.ZodOptional<z.ZodString>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const TinesResponseSchema: z.ZodObject<{
    status: z.ZodString;
    data: z.ZodAny;
}, z.core.$strip>;
