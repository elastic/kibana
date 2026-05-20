/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/bedrock/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const BedrockParamsSchema: z.ZodObject<{
    body: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const BedrockResponseSchema: z.ZodObject<{
    completion: z.ZodString;
    stop_reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
