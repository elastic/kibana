import { z } from '@kbn/zod/v4';
export declare const SearchMessagesInputSchema: z.ZodObject<{
    query: z.ZodString;
    from: z.ZodDefault<z.ZodNumber>;
    size: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type SearchMessagesInput = z.infer<typeof SearchMessagesInputSchema>;
export declare const ListMessagesInputSchema: z.ZodObject<{
    folderId: z.ZodOptional<z.ZodString>;
    top: z.ZodDefault<z.ZodNumber>;
    filter: z.ZodOptional<z.ZodString>;
    orderby: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListMessagesInput = z.infer<typeof ListMessagesInputSchema>;
export declare const GetMessageInputSchema: z.ZodObject<{
    messageId: z.ZodString;
}, z.core.$strip>;
export type GetMessageInput = z.infer<typeof GetMessageInputSchema>;
export declare const GetAttachmentInputSchema: z.ZodObject<{
    messageId: z.ZodString;
    attachmentId: z.ZodString;
}, z.core.$strip>;
export type GetAttachmentInput = z.infer<typeof GetAttachmentInputSchema>;
export declare const ListAttachmentsInputSchema: z.ZodObject<{
    messageId: z.ZodString;
}, z.core.$strip>;
export type ListAttachmentsInput = z.infer<typeof ListAttachmentsInputSchema>;
export declare const ListFoldersInputSchema: z.ZodObject<{
    includeHidden: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type ListFoldersInput = z.infer<typeof ListFoldersInputSchema>;
export declare const SearchMessagesOutputSchema: z.ZodObject<{
    value: z.ZodArray<z.ZodObject<{
        searchTerms: z.ZodOptional<z.ZodArray<z.ZodString>>;
        hitsContainers: z.ZodArray<z.ZodObject<{
            hits: z.ZodOptional<z.ZodArray<z.ZodObject<{
                hitId: z.ZodString;
                rank: z.ZodNumber;
                summary: z.ZodOptional<z.ZodString>;
                resource: z.ZodObject<{
                    id: z.ZodString;
                    subject: z.ZodOptional<z.ZodString>;
                }, z.core.$loose>;
            }, z.core.$strip>>>;
            total: z.ZodOptional<z.ZodNumber>;
            moreResultsAvailable: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const GetMessageOutputSchema: z.ZodObject<{
    id: z.ZodString;
    subject: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodObject<{
        emailAddress: z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            address: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    toRecipients: z.ZodOptional<z.ZodArray<z.ZodObject<{
        emailAddress: z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            address: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
    ccRecipients: z.ZodOptional<z.ZodArray<z.ZodObject<{
        emailAddress: z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            address: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
    bccRecipients: z.ZodOptional<z.ZodArray<z.ZodObject<{
        emailAddress: z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            address: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
    replyTo: z.ZodOptional<z.ZodArray<z.ZodObject<{
        emailAddress: z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            address: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
    receivedDateTime: z.ZodOptional<z.ZodString>;
    sentDateTime: z.ZodOptional<z.ZodString>;
    isRead: z.ZodOptional<z.ZodBoolean>;
    hasAttachments: z.ZodOptional<z.ZodBoolean>;
    body: z.ZodOptional<z.ZodObject<{
        contentType: z.ZodString;
        content: z.ZodString;
    }, z.core.$strip>>;
    bodyPreview: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
    importance: z.ZodOptional<z.ZodString>;
    webLink: z.ZodOptional<z.ZodString>;
    internetMessageId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
