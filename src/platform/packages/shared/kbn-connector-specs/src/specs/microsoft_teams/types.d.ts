import { z } from '@kbn/zod/v4';
export declare const ListJoinedTeamsInputSchema: z.ZodOptional<z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
export type ListJoinedTeamsInput = z.infer<typeof ListJoinedTeamsInputSchema>;
export declare const ListChannelsInputSchema: z.ZodObject<{
    teamId: z.ZodString;
}, z.core.$strip>;
export type ListChannelsInput = z.infer<typeof ListChannelsInputSchema>;
export declare const ListChannelMessagesInputSchema: z.ZodObject<{
    teamId: z.ZodString;
    channelId: z.ZodString;
    top: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type ListChannelMessagesInput = z.infer<typeof ListChannelMessagesInputSchema>;
export declare const ListChatsInputSchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    top: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type ListChatsInput = z.infer<typeof ListChatsInputSchema>;
export declare const ListChatMessagesInputSchema: z.ZodObject<{
    chatId: z.ZodString;
    top: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type ListChatMessagesInput = z.infer<typeof ListChatMessagesInputSchema>;
export declare const SearchMessagesInputSchema: z.ZodObject<{
    query: z.ZodString;
    from: z.ZodOptional<z.ZodNumber>;
    size: z.ZodDefault<z.ZodNumber>;
    enableTopResults: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type SearchMessagesInput = z.infer<typeof SearchMessagesInputSchema>;
