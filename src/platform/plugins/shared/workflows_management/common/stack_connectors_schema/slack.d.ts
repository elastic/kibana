/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/slack/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import { z } from '@kbn/zod/v4';
export declare const SlackParamsSchema: z.ZodObject<{
    message: z.ZodString;
    channel: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    icon_emoji: z.ZodOptional<z.ZodString>;
    icon_url: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const SlackResponseSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    channel: z.ZodOptional<z.ZodString>;
    ts: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodObject<{
        text: z.ZodString;
        username: z.ZodOptional<z.ZodString>;
        bot_id: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodString>;
        subtype: z.ZodOptional<z.ZodString>;
        ts: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
