/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/teams/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const TeamsParamsSchema: z.ZodObject<{
    message: z.ZodString;
}, z.core.$strip>;
export declare const TeamsResponseSchema: z.ZodObject<{
    type: z.ZodString;
    id: z.ZodString;
    timestamp: z.ZodString;
    serviceUrl: z.ZodString;
    channelId: z.ZodString;
    from: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    conversation: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
    recipient: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    text: z.ZodString;
    replyToId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
