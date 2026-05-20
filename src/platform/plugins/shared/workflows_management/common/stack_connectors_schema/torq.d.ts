import { z } from '@kbn/zod/v4';
/**
 * Torq connector parameter schema
 * Based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/torq/index.ts
 */
export declare const TorqParamsSchema: z.ZodObject<{
    body: z.ZodString;
}, z.core.$strip>;
/**
 * Torq connector response schema
 * Torq returns the sent data on successful execution
 */
export declare const TorqResponseSchema: z.ZodAny;
