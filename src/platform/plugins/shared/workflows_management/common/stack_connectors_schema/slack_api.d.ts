/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/slack_api/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const SlackApiPostMessageParamsSchema: z.ZodObject<{
    channels: z.ZodArray<z.ZodString>;
    text: z.ZodString;
    blocks: z.ZodOptional<z.ZodArray<z.ZodAny>>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodAny>>;
    thread_ts: z.ZodOptional<z.ZodString>;
    unfurl_links: z.ZodOptional<z.ZodBoolean>;
    unfurl_media: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const SlackApiGetChannelsParamsSchema: z.ZodObject<{
    types: z.ZodOptional<z.ZodString>;
    exclude_archived: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const SlackApiGetUsersParamsSchema: z.ZodObject<{
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const SlackApiResponseSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    channel: z.ZodOptional<z.ZodString>;
    ts: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodObject<{
        text: z.ZodString;
        user: z.ZodString;
        ts: z.ZodString;
        type: z.ZodString;
    }, z.core.$strip>>;
    channels: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        is_channel: z.ZodBoolean;
        is_archived: z.ZodBoolean;
    }, z.core.$strip>>>;
    members: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        real_name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
