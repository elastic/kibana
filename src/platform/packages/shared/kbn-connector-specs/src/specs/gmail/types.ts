/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// ===== Bounds =====
// ID/token fields: Gmail message, thread, label, and attachment IDs are short
// opaque tokens. Page tokens are opaque cursor strings from the API; kept generous.
// Addresses follow RFC 5321 (max 320 chars). Header values follow RFC 5322's
// 998-octet line limit. Body cap maps to ~137 KB base64-encoded, well within
// Gmail's 25 MB message limit.
export const GMAIL_MAX_ID_LENGTH = 200;
export const GMAIL_MAX_QUERY_LENGTH = 2000;
export const GMAIL_MAX_PAGE_TOKEN_LENGTH = 2048;
export const GMAIL_MAX_LABEL_IDS = 50;
export const GMAIL_MAX_EMAIL_LENGTH = 320; // RFC 5321
export const GMAIL_MAX_RECIPIENTS = 50;
export const GMAIL_MAX_SUBJECT_LENGTH = 998; // RFC 5322 line limit
export const GMAIL_MAX_BODY_LENGTH = 100_000;
export const DEFAULT_MAX_RESULTS = 10;

// Bare addr-spec only; display names ("Alice" <a@b.com>) are not supported.
// Dot handling: the local part is structured as atom(\.atom)* — consecutive dots,
// a leading dot, and a trailing dot are all RFC 5321 violations and are rejected.
// The character class excludes CR/LF, which would allow header injection.
export const GMAIL_EMAIL_REGEX =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

// ===== Read action inputs =====

export const SearchMessagesInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .max(GMAIL_MAX_QUERY_LENGTH)
      .optional()
      .describe(
        'Gmail search query using Gmail search operators. Supported operators: from:user@example.com (sender), to:user@example.com (recipient), subject:keyword (subject line), is:unread / is:read (read status), has:attachment (emails with attachments), after:YYYY/MM/DD / before:YYYY/MM/DD (absolute date range), newer_than:7d / older_than:30d (relative date — d=days, m=months, y=years), label:LABELNAME (by label). Combine operators freely: "from:alice@example.com is:unread newer_than:7d". Prefer narrow queries to avoid large responses.'
      ),
    maxResults: z
      .number()
      .min(1)
      .optional()
      .default(DEFAULT_MAX_RESULTS)
      .describe(
        'Maximum number of message IDs to return (1-100). Prefer 10-20 to keep context small; increase only if user explicitly needs more.'
      ),
    pageToken: z
      .string()
      .max(GMAIL_MAX_PAGE_TOKEN_LENGTH)
      .optional()
      .describe('Token for pagination from a previous response'),
  })
);
export type SearchMessagesInput = z.infer<typeof SearchMessagesInputSchema>;

export const GetMessageInputSchema = lazySchema(() =>
  z.object({
    messageId: z
      .string()
      .min(1, { message: 'messageId is required to retrieve a Gmail message' })
      .max(GMAIL_MAX_ID_LENGTH)
      .describe(
        'Required. The Gmail message ID (e.g. from searchMessages or listMessages). Always pass this when calling getMessage.'
      ),
    format: z
      .enum(['minimal', 'full', 'raw'])
      .optional()
      .default('minimal')
      .describe(
        'Message format: use "minimal" (headers only) to save context; use "full" only when the user needs the email body content.'
      ),
  })
);
export type GetMessageInput = z.infer<typeof GetMessageInputSchema>;

export const GetAttachmentInputSchema = lazySchema(() =>
  z.object({
    messageId: z
      .string()
      .min(1, { message: 'messageId is required to retrieve an attachment' })
      .max(GMAIL_MAX_ID_LENGTH)
      .describe(
        'Required. The Gmail message ID (from getMessage or search/list). Get attachment IDs from getMessage with format "full" — see payload.parts[].body.attachmentId.'
      ),
    attachmentId: z
      .string()
      .min(1, { message: 'attachmentId is required to retrieve an attachment' })
      .max(GMAIL_MAX_ID_LENGTH)
      .describe(
        'Required. The attachment ID from the message. Call getMessage with format "full" and read payload.parts[].body.attachmentId (and parts[].filename for the file name).'
      ),
  })
);
export type GetAttachmentInput = z.infer<typeof GetAttachmentInputSchema>;

export const ListMessagesInputSchema = lazySchema(() =>
  z.object({
    maxResults: z
      .number()
      .min(1)
      .optional()
      .default(DEFAULT_MAX_RESULTS)
      .describe(
        'Maximum number of message IDs to return (1-100). Prefer 10-20 to keep context small.'
      ),
    pageToken: z
      .string()
      .max(GMAIL_MAX_PAGE_TOKEN_LENGTH)
      .optional()
      .describe('Token for pagination from a previous response'),
    labelIds: z
      .array(z.string().min(1).max(GMAIL_MAX_ID_LENGTH))
      .max(GMAIL_MAX_LABEL_IDS)
      .optional()
      .describe(
        'Filter messages by Gmail label IDs (e.g. ["INBOX"], ["SENT"], ["UNREAD"]). Use this to scope to a mailbox folder. Omit to list from all labels. Prefer searchMessages when you need query-based filtering.'
      ),
  })
);
export type ListMessagesInput = z.infer<typeof ListMessagesInputSchema>;

// ===== Write action inputs =====

export const ListLabelsInputSchema = lazySchema(() => z.object({}));
export type ListLabelsInput = z.infer<typeof ListLabelsInputSchema>;

export const ModifyLabelsInputSchema = lazySchema(() =>
  z
    .object({
      messageId: z
        .string()
        .min(1, { message: 'messageId is required' })
        .max(GMAIL_MAX_ID_LENGTH)
        .describe('The Gmail message ID to update labels on.'),
      addLabelIds: z
        .array(z.string().min(1).max(GMAIL_MAX_ID_LENGTH))
        .max(GMAIL_MAX_LABEL_IDS)
        .optional()
        .describe(
          'Label IDs to add to the message (e.g. a custom Quarantine label ID). Call listLabels to resolve a label name to its ID.'
        ),
      removeLabelIds: z
        .array(z.string().min(1).max(GMAIL_MAX_ID_LENGTH))
        .max(GMAIL_MAX_LABEL_IDS)
        .optional()
        .describe(
          'Label IDs to remove from the message (e.g. ["INBOX"] to move out of the inbox). Call listLabels to resolve a label name to its ID.'
        ),
    })
    .refine((value) => Boolean(value.addLabelIds?.length || value.removeLabelIds?.length), {
      message: 'At least one of addLabelIds or removeLabelIds must be provided.',
    })
);
export type ModifyLabelsInput = z.infer<typeof ModifyLabelsInputSchema>;

export const MessageIdInputSchema = lazySchema(() =>
  z.object({
    messageId: z
      .string()
      .min(1, { message: 'messageId is required' })
      .max(GMAIL_MAX_ID_LENGTH)
      .describe('The Gmail message ID.'),
  })
);
export type MessageIdInput = z.infer<typeof MessageIdInputSchema>;

export const SendMessageInputSchema = lazySchema(() =>
  z.object({
    to: z
      .array(
        z.string().max(GMAIL_MAX_EMAIL_LENGTH).regex(GMAIL_EMAIL_REGEX, {
          message: 'Invalid email address (bare addr-spec required, e.g. user@example.com)',
        })
      )
      .min(1, { message: 'At least one recipient is required' })
      .max(GMAIL_MAX_RECIPIENTS)
      .describe('Recipient email addresses (bare addr-spec, e.g. "user@example.com").'),
    subject: z
      .string()
      .max(GMAIL_MAX_SUBJECT_LENGTH)
      .regex(/^[^\r\n]*$/, { message: 'Subject must not contain line breaks.' })
      .describe('Email subject line.'),
    body: z
      .string()
      .min(1, { message: 'body is required' })
      .max(GMAIL_MAX_BODY_LENGTH)
      .describe('Email body content.'),
    bodyType: z
      .enum(['text', 'html'])
      .optional()
      .default('text')
      .describe('Content type of the body: "text" (default) for plain text or "html" for HTML.'),
    cc: z
      .array(
        z
          .string()
          .max(GMAIL_MAX_EMAIL_LENGTH)
          .regex(GMAIL_EMAIL_REGEX, { message: 'Invalid email address' })
      )
      .max(GMAIL_MAX_RECIPIENTS)
      .optional()
      .describe('CC recipient email addresses.'),
    bcc: z
      .array(
        z
          .string()
          .max(GMAIL_MAX_EMAIL_LENGTH)
          .regex(GMAIL_EMAIL_REGEX, { message: 'Invalid email address' })
      )
      .max(GMAIL_MAX_RECIPIENTS)
      .optional()
      .describe(
        'BCC recipient email addresses. Gmail honours a Bcc header in raw messages and strips it from delivered copies.'
      ),
  })
);
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const ReplyMessageInputSchema = lazySchema(() =>
  z.object({
    messageId: z
      .string()
      .min(1, { message: 'messageId is required' })
      .max(GMAIL_MAX_ID_LENGTH)
      .describe(
        'The Gmail message ID to reply to. The handler fetches the original message to extract threading headers and the default recipient.'
      ),
    body: z
      .string()
      .min(1, { message: 'body is required' })
      .max(GMAIL_MAX_BODY_LENGTH)
      .describe('Reply body content.'),
    bodyType: z
      .enum(['text', 'html'])
      .optional()
      .default('text')
      .describe('Content type of the body: "text" (default) for plain text or "html" for HTML.'),
    subject: z
      .string()
      .max(GMAIL_MAX_SUBJECT_LENGTH)
      .regex(/^[^\r\n]*$/, { message: 'Subject must not contain line breaks.' })
      .optional()
      .describe(
        'Reply subject line. Defaults to "Re: <original subject>". Gmail convention prefixes "Re: " unless already present.'
      ),
    to: z
      .array(
        z
          .string()
          .max(GMAIL_MAX_EMAIL_LENGTH)
          .regex(GMAIL_EMAIL_REGEX, { message: 'Invalid email address' })
      )
      .min(1)
      .max(GMAIL_MAX_RECIPIENTS)
      .optional()
      .describe(
        'Override recipient addresses. Defaults to the Reply-To address of the original message, falling back to From.'
      ),
  })
);
export type ReplyMessageInput = z.infer<typeof ReplyMessageInputSchema>;

// ===== Shared outputs =====

// Shared shape for all Gmail message mutation responses (modify, trash, send, reply).
const GmailMessageResultSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    threadId: z.string(),
    labelIds: z.array(z.string()),
  })
);

export const ModifyMessageOutputSchema = GmailMessageResultSchema;
export type ModifyMessageOutput = z.infer<typeof GmailMessageResultSchema>;

export const SendMessageOutputSchema = GmailMessageResultSchema;
export type SendMessageOutput = z.infer<typeof GmailMessageResultSchema>;
