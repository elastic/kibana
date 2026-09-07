/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * Enums from the Sublime Platform API OpenAPI spec
 * (https://docs.sublime.security/openapi/sublime-platform-api.json).
 */
export const ATTACK_SCORE_VERDICTS = [
  'unknown',
  'likely_benign',
  'suspicious',
  'malicious',
  'graymail',
  'spam',
] as const;

export const FLAGGED_RULE_SEVERITIES = [
  'informational',
  'low',
  'medium',
  'high',
  'critical',
] as const;

export const CLASSIFICATIONS = [
  'malicious',
  'benign',
  'spam',
  'graymail',
  'simulation',
  'unwanted',
  'violation',
  'non-violation',
] as const;

export const REPORT_LABELS = [
  'spam',
  'phishing',
  'false_positive',
  'false_negative',
  'phishing_simulation',
  'graymail',
  'violation',
  'non-violation',
] as const;

const ISO_DATE_DESCRIPTION =
  'UTC datetime in ISO 8601 format, e.g. 2026-07-14T15:09:26Z. Relative dates are not supported.';

/**
 * Sublime IDs are UUID-shaped. Restricting the charset also keeps IDs from
 * forming dot path segments ('.', '..') that URL normalization would collapse
 * onto a different endpoint.
 */
const idSchema = (description: string) =>
  z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9_-]+$/, 'IDs contain only letters, numbers, hyphens, and underscores')
    .describe(description);

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const SearchMessageGroupsInputSchema = lazySchema(() =>
  z
    .object({
      flagged: z
        .boolean()
        .optional()
        .describe(
          'Only return message groups with at least one message flagged by a detection rule. Defaults to true unless userReported is set. The Sublime API requires flagged or userReported to be true, so flagged: false is only valid together with userReported: true'
        ),
      userReported: z
        .boolean()
        .optional()
        .describe(
          'Only return message groups with at least one user-reported message (the abuse-mailbox queue)'
        ),
      reviewed: z
        .boolean()
        .optional()
        .describe('Filter by review state: true for reviewed groups, false for unreviewed groups'),
      senderEmail: z
        .string()
        .max(320)
        .optional()
        .describe(
          'Exact sender email address to filter by, e.g. attacker@evil.example. One value per call'
        ),
      senderDomain: z
        .string()
        .max(253)
        .optional()
        .describe('Exact sender domain to filter by, e.g. evil.example. One value per call'),
      recipientEmail: z
        .string()
        .max(320)
        .optional()
        .describe('Exact recipient email address to filter by. One value per call'),
      mailboxEmail: z
        .string()
        .max(320)
        .optional()
        .describe(
          'Exact email address of a Sublime-protected mailbox to filter by, as returned by listMailboxes. One value per call'
        ),
      attachmentSha256: z
        .string()
        .max(64)
        .optional()
        .describe(
          'SHA-256 hash of an attachment to filter by (64 hex characters). One value per call'
        ),
      attackScoreVerdict: z
        .enum(ATTACK_SCORE_VERDICTS)
        .optional()
        .describe('Only return message groups with this Attack Score verdict'),
      flaggedRuleSeverity: z
        .enum(FLAGGED_RULE_SEVERITIES)
        .optional()
        .describe('Only return message groups flagged by a rule of this severity'),
      createdAtGte: z
        .string()
        .max(64)
        .optional()
        .describe(
          `Inclusive start of the creation-time window; defaults to 30 days ago when omitted (the API requires a start time). ${ISO_DATE_DESCRIPTION}`
        ),
      createdAtLt: z
        .string()
        .max(64)
        .optional()
        .describe(`Exclusive end of the creation-time window. ${ISO_DATE_DESCRIPTION}`),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .default(20)
        .describe(
          'Maximum number of message groups to return (1-500, default 20). Prefer 50 or less and page with offset; large pages can exceed the response size limit'
        ),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe('Zero-based offset for pagination; combine with limit to page through results'),
    })
    // The Sublime API rejects searches where neither flagged nor user_reported
    // is true, so catch the one combination Kibana would otherwise let through.
    .refine((value) => !(value.flagged === false && value.userReported !== true), {
      message:
        'flagged: false is only valid together with userReported: true (the Sublime API requires at least one of flagged or userReported to be true)',
    })
);
export type SearchMessageGroupsInput = z.infer<typeof SearchMessageGroupsInputSchema>;

export const GetMessageGroupInputSchema = lazySchema(() =>
  z.object({
    messageGroupId: idSchema(
      'Canonical ID of the message group, as returned by searchMessageGroups'
    ),
  })
);
export type GetMessageGroupInput = z.infer<typeof GetMessageGroupInputSchema>;

export const GetMessageInputSchema = lazySchema(() =>
  z.object({
    messageId: idSchema('ID of the message, as returned by searchMessageGroups or getMessageGroup'),
  })
);
export type GetMessageInput = z.infer<typeof GetMessageInputSchema>;

export const ListMailboxesInputSchema = lazySchema(() =>
  z.object({
    active: z
      .boolean()
      .optional()
      .describe('Only return mailboxes that are actively protected by Sublime'),
    search: z
      .string()
      .max(320)
      .optional()
      .describe('Search across mailbox names and email addresses'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .default(20)
      .describe('Maximum number of mailboxes to return (1-500, default 20)'),
    offset: z.number().int().min(0).default(0).describe('Zero-based offset for pagination'),
  })
);
export type ListMailboxesInput = z.infer<typeof ListMailboxesInputSchema>;

export const MessageGroupActionInputSchema = lazySchema(() =>
  z.object({
    messageGroupIds: z
      .array(
        z
          .string()
          .min(1)
          .max(200)
          .regex(/^[A-Za-z0-9_-]+$/, 'IDs contain only letters, numbers, hyphens, and underscores')
      )
      .min(1)
      .max(500)
      .describe('Canonical IDs of the message groups to act on (1-500 per call)'),
    classification: z
      .enum(CLASSIFICATIONS)
      .optional()
      .describe('Classification to record with the action, e.g. malicious'),
    reportLabel: z
      .enum(REPORT_LABELS)
      .optional()
      .describe('Label recorded for reporting, e.g. phishing or false_positive'),
    reviewComment: z
      .string()
      .max(2000)
      .optional()
      .describe('Free-text review comment recorded in the Sublime audit trail'),
  })
);
export type MessageGroupActionInput = z.infer<typeof MessageGroupActionInputSchema>;

export const GetTaskInputSchema = lazySchema(() =>
  z.object({
    taskId: idSchema(
      'Task ID returned by quarantineMessageGroups, trashMessageGroups, or restoreMessageGroups'
    ),
  })
);
export type GetTaskInput = z.infer<typeof GetTaskInputSchema>;

// =============================================================================
// Trimmed response types (responses are field-selected, never raw passthrough)
// =============================================================================

export interface SublimeRuleSummary {
  id?: string;
  name?: string;
}

export interface SublimeMessageSummary {
  id?: string;
  subject?: string;
  sender?: { email?: string; display_name?: string };
  created_at?: string;
  mailbox_email?: string;
  read_at?: string | null;
  forwarded_at?: string | null;
  replied_at?: string | null;
}

export interface SublimeMessageGroupSummary {
  id?: string;
  state?: string;
  classification?: string | null;
  review_status?: string | null;
  review_label?: string | null;
  review_comment?: string | null;
  flagged_rules: SublimeRuleSummary[];
  message_count: number;
  messages: SublimeMessageSummary[];
}
