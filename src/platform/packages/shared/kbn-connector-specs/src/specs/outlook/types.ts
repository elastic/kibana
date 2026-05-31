/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const SearchMessagesInputSchema = z.object({
  query: z
    .string()
    .describe(
      'Keyword Query Language (KQL) search query for mail content. Examples: "subject:budget Q4", "from:alice@contoso.com", "hasAttachments:true AND subject:report". Supports standard KQL operators (AND, OR, NOT) and property restrictions (from, subject, body, hasAttachments, sent, received).'
    ),
  from: z
    .number()
    .min(0)
    .default(0)
    .describe('Zero-based offset for pagination (default: 0). Use with size to page results.'),
  size: z
    .number()
    .min(1)
    .max(25)
    .default(10)
    .describe('Number of results to return (1–25, default 10).'),
});
export type SearchMessagesInput = z.infer<typeof SearchMessagesInputSchema>;

export const ListMessagesInputSchema = z.object({
  folderId: z
    .string()
    .optional()
    .describe(
      'The well-known folder name or ID of the mail folder to list messages from. Well-known names: "inbox", "sentitems", "drafts", "deleteditems", "junkemail". Omit to list from all folders via the search API. Use listFolders to discover folder IDs.'
    ),
  top: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of messages to return (1–100, default 20).'),
  filter: z
    .string()
    .optional()
    .describe(
      'OData $filter expression to filter messages. Examples: "isRead eq false", "receivedDateTime ge 2024-01-01T00:00:00Z", "from/emailAddress/address eq \'alice@contoso.com\'". Supports OData filter operators.'
    ),
  orderby: z
    .string()
    .optional()
    .describe(
      'OData $orderby expression to sort messages. Examples: "receivedDateTime desc" (default), "subject asc". Only one property can be used.'
    ),
});
export type ListMessagesInput = z.infer<typeof ListMessagesInputSchema>;

export const GetMessageInputSchema = z.object({
  messageId: z
    .string()
    .describe(
      'The ID of the Outlook message to retrieve. Obtain this from listMessages (the "id" field on each message object) or searchMessages (the resource.id field in hits).'
    ),
});
export type GetMessageInput = z.infer<typeof GetMessageInputSchema>;

export const GetAttachmentInputSchema = z.object({
  messageId: z
    .string()
    .describe(
      'The ID of the Outlook message that contains the attachment. Use listMessages or searchMessages to find message IDs.'
    ),
  attachmentId: z
    .string()
    .describe(
      'The ID of the attachment to retrieve. Use listAttachments to discover attachment IDs for a given message.'
    ),
});
export type GetAttachmentInput = z.infer<typeof GetAttachmentInputSchema>;

export const ListAttachmentsInputSchema = z.object({
  messageId: z
    .string()
    .describe(
      'The ID of the Outlook message whose attachments you want to list. Use listMessages or searchMessages to find message IDs.'
    ),
});
export type ListAttachmentsInput = z.infer<typeof ListAttachmentsInputSchema>;

export const ListFoldersInputSchema = z.object({
  includeHidden: z
    .boolean()
    .default(false)
    .describe(
      'Whether to include hidden mail folders (default: false). Set to true to enumerate all folders including system folders.'
    ),
});
export type ListFoldersInput = z.infer<typeof ListFoldersInputSchema>;

// =============================================================================
// Action output schemas
// =============================================================================

const EmailAddressSchema = z.object({
  emailAddress: z.object({
    name: z.string().optional(),
    address: z.string(),
  }),
});

export const SearchMessagesOutputSchema = z.object({
  value: z.array(
    z.object({
      searchTerms: z.array(z.string()).optional(),
      hitsContainers: z.array(
        z.object({
          hits: z
            .array(
              z.object({
                hitId: z.string(),
                rank: z.number(),
                summary: z.string().optional(),
                resource: z
                  .object({ id: z.string(), subject: z.string().optional() })
                  .passthrough(),
              })
            )
            .optional(),
          total: z.number().optional(),
          moreResultsAvailable: z.boolean().optional(),
        })
      ),
    })
  ),
});

export const GetMessageOutputSchema = z.object({
  id: z.string(),
  subject: z.string().optional(),
  from: EmailAddressSchema.optional(),
  toRecipients: z.array(EmailAddressSchema).optional(),
  ccRecipients: z.array(EmailAddressSchema).optional(),
  bccRecipients: z.array(EmailAddressSchema).optional(),
  replyTo: z.array(EmailAddressSchema).optional(),
  receivedDateTime: z.string().optional(),
  sentDateTime: z.string().optional(),
  isRead: z.boolean().optional(),
  hasAttachments: z.boolean().optional(),
  body: z.object({ contentType: z.string(), content: z.string() }).optional(),
  bodyPreview: z.string().optional(),
  conversationId: z.string().optional(),
  importance: z.string().optional(),
  webLink: z.string().optional(),
  internetMessageId: z.string().optional(),
});
