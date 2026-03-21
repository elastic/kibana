/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/common/d3security/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import { z } from '@kbn/zod/v4';
export declare const D3SecurityRunParamsSchema: z.ZodObject<{
    body: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodString>;
    eventType: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const D3SecurityTestParamsSchema: z.ZodObject<{
    body: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodString>;
    eventType: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const D3SecurityResponseSchema: z.ZodObject<{
    refid: z.ZodString;
}, z.core.$strip>;
