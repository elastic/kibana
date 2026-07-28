/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type {
  GetMessageGroupInput,
  GetMessageInput,
  GetTaskInput,
  ListMailboxesInput,
  MessageGroupActionInput,
  SearchMessageGroupsInput,
  SublimeMessageGroupSummary,
  SublimeMessageSummary,
} from './types';
import {
  GetMessageGroupInputSchema,
  GetMessageInputSchema,
  GetTaskInputSchema,
  ListMailboxesInputSchema,
  MessageGroupActionInputSchema,
  SearchMessageGroupsInputSchema,
} from './types';

interface SublimeConfig {
  baseUrl?: string;
}

/**
 * Sublime deployments are region- or customer-specific (six cloud regions plus
 * self-hosted instances), so the base URL comes from connector config.
 * Trailing slashes are trimmed so path concatenation stays predictable.
 */
const getBaseUrl = (ctx: ActionContext): string => {
  const { baseUrl } = ctx.config as SublimeConfig;
  if (!baseUrl) {
    throw new Error('Sublime Security connector is missing the API base URL configuration');
  }
  return baseUrl.replace(/\/+$/, '');
};

/**
 * Surface Sublime's error payload and request ID (Sublime support correlates on
 * X-Request-ID) instead of a bare axios message.
 */
const throwWithApiError = (error: unknown): never => {
  const axiosError = error as {
    response?: { status?: number; data?: unknown; headers?: Record<string, unknown> };
    message?: string;
  };
  if (axiosError.response?.data !== undefined) {
    const detail =
      typeof axiosError.response.data === 'string'
        ? axiosError.response.data
        : JSON.stringify(axiosError.response.data);
    const requestId = axiosError.response.headers?.['x-request-id'];
    const requestIdSuffix = requestId ? ` (request id: ${String(requestId)})` : '';
    throw new Error(
      `Sublime Security API error (${axiosError.response.status}): ${detail}${requestIdSuffix}`
    );
  }
  throw error;
};

interface RawMessage {
  id?: string;
  subject?: string;
  sender?: { email?: string; display_name?: string };
  created_at?: string;
  mailbox?: { email?: string };
  read_at?: string | null;
  forwarded_at?: string | null;
  replied_at?: string | null;
}

interface RawMessageGroup {
  id?: string;
  state?: string;
  classification?: string | null;
  review_status?: string | null;
  review_label?: string | null;
  review_comment?: string | null;
  flagged_rules?: Array<{ id?: string; name?: string }>;
  messages?: RawMessage[];
  user_reports?: unknown[];
  message_links_clicked?: unknown[];
}

const MAX_MESSAGES_IN_SUMMARY = 5;
const MAX_MESSAGES_IN_DETAIL = 50;
const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

const trimMessage = (message: RawMessage): SublimeMessageSummary => ({
  id: message.id,
  subject: message.subject,
  sender: message.sender
    ? { email: message.sender.email, display_name: message.sender.display_name }
    : undefined,
  created_at: message.created_at,
  mailbox_email: message.mailbox?.email,
  read_at: message.read_at,
  forwarded_at: message.forwarded_at,
  replied_at: message.replied_at,
});

const trimMessageGroup = (
  group: RawMessageGroup,
  maxMessages: number
): SublimeMessageGroupSummary => {
  const messages = group.messages ?? [];
  return {
    id: group.id,
    state: group.state,
    classification: group.classification,
    review_status: group.review_status,
    review_label: group.review_label,
    review_comment: group.review_comment,
    flagged_rules: (group.flagged_rules ?? []).map((rule) => ({ id: rule.id, name: rule.name })),
    message_count: messages.length,
    messages: messages.slice(0, maxMessages).map(trimMessage),
  };
};

const buildActionBody = (input: MessageGroupActionInput) => ({
  message_group_ids: input.messageGroupIds,
  ...(input.classification && { classification: input.classification }),
  ...(input.reportLabel && { report_label: input.reportLabel }),
  ...(input.reviewComment && { review_comment: input.reviewComment }),
});

const TASK_RESULT_DESCRIPTION =
  'Returns a task_id. The action runs asynchronously in Sublime; use getTask to confirm it succeeded before reporting success.';

export const SublimeSecurityConnector: ConnectorSpec = {
  metadata: {
    id: '.sublime_security',
    displayName: 'Sublime Security',
    description: i18n.translate('core.kibanaConnectorSpecs.sublimeSecurity.metadata.description', {
      defaultMessage:
        'Search flagged email, get verdicts, and quarantine, trash, or restore message groups in Sublime Security',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.sublimeSecurity.auth.bearer.label', {
            defaultMessage: 'API key',
          }),
          meta: {
            token: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.sublimeSecurity.auth.bearer.tokenLabel',
                { defaultMessage: 'API key' }
              ),
            },
          },
        },
      },
    ],
    headers: {
      'User-Agent': 'ElasticKibana',
    },
  },

  schema: lazySchema(() =>
    z.object({
      baseUrl: z
        .url()
        .max(1024)
        .describe(
          'Sublime Platform API base URL. Shown under Automate > API in the Sublime dashboard'
        )
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.sublimeSecurity.config.baseUrl', {
            defaultMessage: 'API base URL',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.sublimeSecurity.config.baseUrlHelp', {
            defaultMessage:
              'Region-specific for Sublime Cloud (for example https://platform.sublime.security or https://eu.platform.sublime.security) or the host of a self-hosted instance. Find it under Automate > API in the Sublime dashboard.',
          }),
          placeholder: 'https://platform.sublime.security',
          validate: { allowedHosts: true },
        }),
    })
  ),

  skill: `Sublime Security detects and remediates email threats (phishing, BEC, malware). Messages are deduplicated into message groups (campaign-like clusters); response actions operate on groups.

Typical response flow:
1. searchMessageGroups to find the campaign (by sender, domain, recipient, attachment hash, verdict, or time window). Use listMailboxes first if you need to scope by protected mailbox.
2. getMessageGroup / getMessage / getAttackScore / getAsaVerdict to confirm the verdict.
3. quarantineMessageGroups or trashMessageGroups with a classification and review comment (workflow steps only, not agent tools).
4. getTask with the returned task_id to verify the action succeeded before reporting the outcome.

Gotchas:
- searchMessageGroups paginates with limit/offset. total is the match count, but when stats_limit_exceeded is true it is only a lower bound — keep paging until a page returns fewer than limit groups instead of stopping at offset >= total.
- searchMessageGroups requires flagged or userReported to be true; flagged: false is only valid together with userReported: true.
- Message body content is not returned by any action here; responses carry metadata, verdicts, and rule matches only.
- A mutation can occasionally return a server_timeout error while still completing server-side. Check the group state with getMessageGroup before assuming it failed; retrying the same mutation is safe (same target state).`,

  actions: {
    searchMessageGroups: {
      isTool: true,
      description:
        'Search Sublime Security message groups (campaign-like clusters of deduplicated email). ' +
        'Filter by sender, domain, recipient, mailbox, attachment SHA-256, Attack Score verdict, rule severity, review state, or time window. ' +
        'Searches flagged groups by default; set userReported instead to search the user-reported queue. ' +
        'The time window defaults to the last 30 days when createdAtGte is omitted. ' +
        'Use this first to find the group IDs that other actions operate on. ' +
        'Returns id, state, classification, review fields, flagged rule names, message count, and up to 5 sample messages per group. ' +
        'Also returns total (the match count) and stats_limit_exceeded; when stats_limit_exceeded is true, total is only a lower bound, so keep paging until a page returns fewer than limit groups instead of stopping at offset >= total.',
      input: SearchMessageGroupsInputSchema,
      handler: async (ctx, input: SearchMessageGroupsInput) => {
        try {
          // The live API requires a time anchor (created_at__gte) and at least one
          // of flagged/user_reported to be true, so both get sensible defaults.
          const flagged = input.flagged ?? (input.userReported ? undefined : true);
          const createdAtGte =
            input.createdAtGte ?? new Date(Date.now() - THIRTY_DAYS_IN_MS).toISOString();

          // Sublime's `__is`/`__gte`/`__lt` param names violate the object-literal
          // naming-convention lint rule, so they are assigned via member access.
          const params: Record<string, string | number | boolean | undefined> = {
            flagged,
            user_reported: input.userReported,
            reviewed: input.reviewed,
            limit: input.limit,
            offset: input.offset,
          };
          params.sender_email__is = input.senderEmail;
          params.sender_domain__is = input.senderDomain;
          params.recipient_email__is = input.recipientEmail;
          params.mailbox_email__is = input.mailboxEmail;
          params.attachment_sha256__is = input.attachmentSha256;
          params.attack_score_verdict__is = input.attackScoreVerdict;
          params.flagged_rule_severity__is = input.flaggedRuleSeverity;
          params.created_at__gte = createdAtGte;
          params.created_at__lt = input.createdAtLt;

          const response = await ctx.client.get(`${getBaseUrl(ctx)}/v0/message-groups`, {
            params,
          });
          const data = response.data as {
            total?: number;
            count?: number;
            stats_limit_exceeded?: boolean;
            message_groups?: RawMessageGroup[];
          };
          return {
            total: data.total,
            count: data.count,
            // When true, total is only a lower bound: a workflow paging until
            // offset >= total would stop early and leave matching groups
            // unprocessed. Preserved so callers can page to exhaustion instead.
            stats_limit_exceeded: data.stats_limit_exceeded,
            message_groups: (data.message_groups ?? []).map((group) =>
              trimMessageGroup(group, MAX_MESSAGES_IN_SUMMARY)
            ),
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getMessageGroup: {
      isTool: true,
      description:
        'Get one Sublime Security message group by its canonical ID, including flagged rules, review state, ' +
        'user report count, link click count, and up to 50 member messages with sender, subject, and read/forward/reply telemetry. ' +
        'Use after searchMessageGroups to inspect a group before acting on it.',
      input: GetMessageGroupInputSchema,
      handler: async (ctx, input: GetMessageGroupInput) => {
        try {
          const response = await ctx.client.get(
            `${getBaseUrl(ctx)}/v0/message-groups/${encodeURIComponent(input.messageGroupId)}`
          );
          const group = response.data as RawMessageGroup;
          return {
            ...trimMessageGroup(group, MAX_MESSAGES_IN_DETAIL),
            user_report_count: (group.user_reports ?? []).length,
            link_click_count: (group.message_links_clicked ?? []).length,
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getMessage: {
      isTool: true,
      description:
        'Get metadata for a single message by its ID: subject, sender, recipients, mailbox, timestamps ' +
        '(created, read, forwarded, replied), and whether it landed in spam. ' +
        'Returns metadata only, not the message body.',
      input: GetMessageInputSchema,
      handler: async (ctx, input: GetMessageInput) => {
        try {
          const response = await ctx.client.get(
            `${getBaseUrl(ctx)}/v0/messages/${encodeURIComponent(input.messageId)}`
          );
          const message = response.data as RawMessage & {
            canonical_id?: string;
            external_id?: string;
            recipients?: Array<{ email?: string }>;
            forward_recipients?: string[];
            landed_in_spam?: boolean;
          };
          return {
            id: message.id,
            canonical_id: message.canonical_id,
            external_id: message.external_id,
            subject: message.subject,
            sender: message.sender
              ? { email: message.sender.email, display_name: message.sender.display_name }
              : undefined,
            recipients: (message.recipients ?? []).map((recipient) => ({
              email: recipient.email,
            })),
            forward_recipients: message.forward_recipients,
            mailbox_email: message.mailbox?.email,
            created_at: message.created_at,
            read_at: message.read_at,
            forwarded_at: message.forwarded_at,
            replied_at: message.replied_at,
            landed_in_spam: message.landed_in_spam,
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getAttackScore: {
      isTool: true,
      description:
        'Get the Sublime Attack Score for a message: a 0-100 machine-learning score, a verdict ' +
        '(malicious, suspicious, spam, graymail, likely_benign, or unknown), a graymail score, and the ranked top signals explaining the verdict. ' +
        'Use to enrich a case or decide whether a message needs remediation.',
      input: GetMessageInputSchema,
      handler: async (ctx, input: GetMessageInput) => {
        try {
          const response = await ctx.client.get(
            `${getBaseUrl(ctx)}/v0/messages/${encodeURIComponent(input.messageId)}/attack_score`
          );
          const data = response.data as {
            score?: number;
            verdict?: string;
            graymail_score?: number;
            top_signals?: Array<{ category?: string; description?: string; rank?: number }>;
          };
          return {
            score: data.score,
            verdict: data.verdict,
            graymail_score: data.graymail_score,
            top_signals: (data.top_signals ?? []).map((signal) => ({
              category: signal.category,
              description: signal.description,
              rank: signal.rank,
            })),
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getAsaVerdict: {
      isTool: true,
      description:
        "Get the verdict from Sublime's Autonomous Security Analyst (ASA) for a message: " +
        'malicious, spam, graymail, likely_benign, benign, or unknown. ' +
        'ASA only triages user-reported and low-confidence flagged messages; for a message ASA has not triaged, this returns triaged: false with a null verdict instead of an error.',
      input: GetMessageInputSchema,
      handler: async (ctx, input: GetMessageInput) => {
        try {
          const response = await ctx.client.get(
            `${getBaseUrl(ctx)}/v0/messages/${encodeURIComponent(input.messageId)}/asa_verdict`
          );
          const data = response.data as { verdict?: string };
          return { triaged: true, verdict: data.verdict };
        } catch (error) {
          // ASA not having triaged a message is the common case, not a failure.
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return { triaged: false, verdict: null };
          }
          throwWithApiError(error);
        }
      },
    },

    listMailboxes: {
      isTool: true,
      description:
        'List the mailboxes protected by Sublime Security, with active state and subscription health. ' +
        'The orientation tool: use it to discover which mailboxes Sublime covers or to resolve a mailbox email before filtering searches.',
      input: ListMailboxesInputSchema,
      handler: async (ctx, input: ListMailboxesInput) => {
        try {
          const response = await ctx.client.get(`${getBaseUrl(ctx)}/v0/mailboxes`, {
            params: {
              active: input.active,
              search: input.search,
              limit: input.limit,
              offset: input.offset,
            },
          });
          const data = response.data as {
            total?: number;
            count?: number;
            active?: number;
            mailboxes?: Array<{
              id?: string;
              email_address?: string;
              active?: boolean;
              subscription_error_status?: string;
            }>;
          };
          return {
            total: data.total,
            count: data.count,
            active: data.active,
            mailboxes: (data.mailboxes ?? []).map((mailbox) => ({
              id: mailbox.id,
              email_address: mailbox.email_address,
              active: mailbox.active,
              subscription_error_status: mailbox.subscription_error_status,
            })),
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    quarantineMessageGroups: {
      // Deliberately not a tool: destructive mailbox mutation, workflow steps only.
      isTool: false,
      description:
        'Quarantine one or more message groups: removes the messages from user mailboxes and holds them, ' +
        'and also quarantines late-arriving copies of the same messages. Optionally records a classification, report label, and review comment. ' +
        `Reversible with restoreMessageGroups. Requires a Sublime Enterprise plan. ${TASK_RESULT_DESCRIPTION}`,
      input: MessageGroupActionInputSchema,
      handler: async (ctx, input: MessageGroupActionInput) => {
        try {
          const response = await ctx.client.post(
            `${getBaseUrl(ctx)}/v0/message-groups/quarantine`,
            buildActionBody(input)
          );
          const data = response.data as { task_id?: string };
          return { task_id: data.task_id };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    trashMessageGroups: {
      // Deliberately not a tool: destructive mailbox mutation, workflow steps only.
      isTool: false,
      description:
        'Move all messages in one or more message groups to trash in the affected mailboxes, ' +
        'and keep auto-trashing late-arriving copies of the same messages. ' +
        'Optionally records a classification, report label, and review comment. ' +
        `Reversible with restoreMessageGroups. ${TASK_RESULT_DESCRIPTION}`,
      input: MessageGroupActionInputSchema,
      handler: async (ctx, input: MessageGroupActionInput) => {
        try {
          const response = await ctx.client.post(
            `${getBaseUrl(ctx)}/v0/message-groups/trash`,
            buildActionBody(input)
          );
          const data = response.data as { task_id?: string };
          return { task_id: data.task_id };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    restoreMessageGroups: {
      // Deliberately not a tool: mailbox mutation (the undo), workflow steps only.
      isTool: false,
      description:
        'Restore one or more previously quarantined or trashed message groups back to user mailboxes, ' +
        'and turn off automatic trashing of late-arriving copies. ' +
        'The undo for quarantineMessageGroups and trashMessageGroups; use it to recover from a false positive. ' +
        TASK_RESULT_DESCRIPTION,
      input: MessageGroupActionInputSchema,
      handler: async (ctx, input: MessageGroupActionInput) => {
        try {
          const response = await ctx.client.post(
            `${getBaseUrl(ctx)}/v0/message-groups/restore`,
            buildActionBody(input)
          );
          const data = response.data as { task_id?: string };
          return { task_id: data.task_id };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getTask: {
      isTool: true,
      description:
        'Get the status of an asynchronous Sublime task by ID: pending, started, succeeded, failed, or retrying, plus an error message when failed. ' +
        'Quarantine, trash, and restore return a task_id; poll this until the state is succeeded or failed before reporting the outcome.',
      input: GetTaskInputSchema,
      handler: async (ctx, input: GetTaskInput) => {
        try {
          const response = await ctx.client.get(
            `${getBaseUrl(ctx)}/v0/tasks/${encodeURIComponent(input.taskId)}`
          );
          const data = response.data as {
            id?: string;
            state?: string;
            error?: string;
            created_at?: string;
          };
          // A task response without id or state cannot be acted on (callers
          // poll on state), so treat it as a failure rather than returning
          // an ambiguous partial result.
          if (!data.id || !data.state) {
            throw new Error(
              `Sublime Security returned an unexpected task response for task ${
                input.taskId
              }: missing ${!data.id ? 'id' : 'state'}`
            );
          }
          return {
            id: data.id,
            state: data.state,
            error: data.error,
            created_at: data.created_at,
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.sublimeSecurity.test.description', {
      defaultMessage: 'Verifies the Sublime Security connection by listing one protected mailbox',
    }),
    handler: async (ctx) => {
      try {
        await ctx.client.get(`${getBaseUrl(ctx)}/v0/mailboxes`, {
          params: { limit: 1 },
        });
        return { ok: true, message: 'Successfully connected to the Sublime Platform API' };
      } catch (error) {
        return throwWithApiError(error);
      }
    },
  },
};
