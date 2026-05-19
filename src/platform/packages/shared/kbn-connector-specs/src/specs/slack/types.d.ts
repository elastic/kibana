import { z } from '@kbn/zod/v4';
export interface SlackAssistantSearchContextMessage {
    author_name?: string;
    author_user_id?: string;
    team_id?: string;
    channel_id?: string;
    channel_name?: string;
    message_ts?: string;
    content?: string;
    is_author_bot?: boolean;
    permalink?: string;
    blocks?: unknown;
    context_messages?: unknown;
}
export interface SlackAssistantSearchContextResponse {
    ok: boolean;
    error?: string;
    needed?: string;
    provided?: string;
    results?: {
        messages?: SlackAssistantSearchContextMessage[];
        files?: unknown[];
        channels?: unknown[];
    };
    response_metadata?: {
        next_cursor?: string;
    };
}
export interface SlackErrorFields {
    error?: string;
    needed?: string;
    provided?: string;
}
export interface SlackConversationsListChannel {
    id?: string;
    name?: string;
    is_private?: boolean;
    is_archived?: boolean;
    is_member?: boolean;
}
export interface SlackConversationsListResponse extends SlackErrorFields {
    ok: boolean;
    channels?: SlackConversationsListChannel[];
    response_metadata?: {
        next_cursor?: string;
    };
}
export type SlackConversationsListParams = Record<string, string | number | boolean>;
export declare const SlackResolveChannelIdInputSchema: z.ZodObject<{
    name: z.ZodString;
    types: z.ZodPipe<z.ZodOptional<z.ZodArray<z.ZodEnum<{
        public_channel: "public_channel";
        private_channel: "private_channel";
        im: "im";
        mpim: "mpim";
    }>>>, z.ZodTransform<("public_channel" | "private_channel" | "im" | "mpim")[], ("public_channel" | "private_channel" | "im" | "mpim")[] | undefined>>;
    match: z.ZodDefault<z.ZodEnum<{
        exact: "exact";
        contains: "contains";
    }>>;
    excludeArchived: z.ZodDefault<z.ZodBoolean>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    maxPages: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type SlackResolveChannelIdInput = z.infer<typeof SlackResolveChannelIdInputSchema>;
export declare const SlackListChannelsInputSchema: z.ZodObject<{
    types: z.ZodPipe<z.ZodOptional<z.ZodArray<z.ZodEnum<{
        public_channel: "public_channel";
        private_channel: "private_channel";
        im: "im";
        mpim: "mpim";
    }>>>, z.ZodTransform<("public_channel" | "private_channel" | "im" | "mpim")[], ("public_channel" | "private_channel" | "im" | "mpim")[] | undefined>>;
    excludeArchived: z.ZodDefault<z.ZodBoolean>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    raw: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type SlackListChannelsInput = z.infer<typeof SlackListChannelsInputSchema>;
export declare const SLACK_SEARCH_DEFAULT_COUNT = 20;
export declare const SlackSearchMessagesInputSchema: z.ZodObject<{
    query: z.ZodString;
    inChannel: z.ZodOptional<z.ZodString>;
    fromUser: z.ZodOptional<z.ZodString>;
    after: z.ZodOptional<z.ZodString>;
    before: z.ZodOptional<z.ZodString>;
    sort: z.ZodOptional<z.ZodEnum<{
        timestamp: "timestamp";
        score: "score";
    }>>;
    sortDir: z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    count: z.ZodOptional<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
    includeContextMessages: z.ZodOptional<z.ZodBoolean>;
    includeBots: z.ZodOptional<z.ZodBoolean>;
    includeMessageBlocks: z.ZodOptional<z.ZodBoolean>;
    raw: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type SlackSearchMessagesInput = z.infer<typeof SlackSearchMessagesInputSchema>;
export declare const SlackCreateConversationInputSchema: z.ZodObject<{
    name: z.ZodString;
    isPrivate: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type SlackCreateConversationInput = z.infer<typeof SlackCreateConversationInputSchema>;
export declare const SlackInviteToConversationInputSchema: z.ZodObject<{
    channel: z.ZodString;
    users: z.ZodString;
}, z.core.$strip>;
export type SlackInviteToConversationInput = z.infer<typeof SlackInviteToConversationInputSchema>;
export declare const SlackSendMessageInputSchema: z.ZodObject<{
    channel: z.ZodString;
    text: z.ZodString;
    threadTs: z.ZodOptional<z.ZodString>;
    unfurlLinks: z.ZodOptional<z.ZodBoolean>;
    unfurlMedia: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type SlackSendMessageInput = z.infer<typeof SlackSendMessageInputSchema>;
