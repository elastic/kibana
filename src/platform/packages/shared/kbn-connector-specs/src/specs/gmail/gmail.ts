/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { buildRawMessage, extractAddrSpec, findHeader } from './mime';
import {
  DEFAULT_MAX_RESULTS,
  GMAIL_EMAIL_REGEX,
  GetAttachmentInputSchema,
  GetMessageInputSchema,
  ListLabelsInputSchema,
  ListMessagesInputSchema,
  MessageIdInputSchema,
  ModifyLabelsInputSchema,
  ModifyMessageOutputSchema,
  ReplyMessageInputSchema,
  SearchMessagesInputSchema,
  SendMessageInputSchema,
  SendMessageOutputSchema,
  type GetAttachmentInput,
  type GetMessageInput,
  type ListMessagesInput,
  type MessageIdInput,
  type ModifyLabelsInput,
  type ReplyMessageInput,
  type SearchMessagesInput,
  type SendMessageInput,
} from './types';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const MAX_PAGE_SIZE = 100;
const UNREAD_LABEL_ID = 'UNREAD';

// Scopes that authorize any of the Gmail write operations this connector exposes.
const GMAIL_WRITE_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
];

const RE_AUTHORIZE_HINT =
  'Edit the Gmail connector and re-authorize it so Google issues a token that includes ' +
  '"https://www.googleapis.com/auth/gmail.modify".';

/**
 * Fails a write action before it reaches Gmail when the connector's credentials
 * cannot authorize it.
 *
 * Two cases handled:
 * - EARS: the scope is pinned to gmail.readonly and cannot be changed (platform
 *   limitation), so every EARS-authorized connector will 403 on any write.
 * - A persisted OAuth scope that predates write support. Widening the spec's
 *   default scope does not re-trigger Google's consent screen, so an existing
 *   connector keeps its read-only grant until someone re-authorizes it.
 */
const assertWriteCapableAuth = (ctx: ActionContext, action: string): void => {
  if (ctx.secrets?.authType === 'ears') {
    throw new Error(
      `${action} is not available on a Gmail connector that uses Elastic managed ` +
        `authentication, which is limited to read-only Gmail access. ` +
        `Create a Gmail connector with the "OAuth 2.0 authorization code" ` +
        `authentication type to use write actions.`
    );
  }

  const scope = ctx.secrets?.scope;
  // Bearer tokens have no recorded scope; let Gmail decide and rely on throwGmailError.
  if (typeof scope !== 'string' || scope.length === 0) {
    return;
  }

  const granted = new Set(scope.split(/[\s,]+/).filter(Boolean));
  if (!GMAIL_WRITE_SCOPES.some((writeScope) => granted.has(writeScope))) {
    throw new Error(
      `${action} requires a Gmail write scope, but this connector was authorized with ` +
        `"${scope}". ${RE_AUTHORIZE_HINT}`
    );
  }
};

function throwGmailError(error: unknown): void {
  const axiosError = error as {
    response?: {
      data?: {
        error?: {
          message?: string;
          code?: number;
          status?: string;
          errors?: Array<{ reason?: string }>;
        };
      };
    };
  };
  const gmailError = axiosError.response?.data?.error;
  if (!gmailError) {
    return;
  }

  // A 403 with ACCESS_TOKEN_SCOPE_INSUFFICIENT or insufficientPermissions as
  // the error reason is almost always a token issued before write support was
  // added to this connector. Add a re-authorize hint.
  const isScopeError =
    gmailError.code === 403 &&
    (gmailError.status === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' ||
      Boolean(gmailError.errors?.some((e) => e.reason === 'insufficientPermissions')));

  throw new Error(
    `Gmail API error (${gmailError.code ?? 'unknown'}): ${gmailError.message ?? 'Unknown'}` +
      (isScopeError ? ` ${RE_AUTHORIZE_HINT}` : '')
  );
}

interface ModifyMessageLabelsArgs {
  messageId: string;
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

/**
 * Shared implementation for modifyLabels, markAsRead, and markAsUnread.
 * Gmail's read state is the `UNREAD` system label, so all three are the
 * same POST with a different label delta.
 */
const modifyMessageLabels = async (
  ctx: ActionContext,
  action: string,
  { messageId, addLabelIds, removeLabelIds }: ModifyMessageLabelsArgs
): Promise<{ id: string; threadId: string; labelIds: string[] }> => {
  assertWriteCapableAuth(ctx, action);

  const payload: { addLabelIds?: string[]; removeLabelIds?: string[] } = {};
  if (addLabelIds?.length) payload.addLabelIds = addLabelIds;
  if (removeLabelIds?.length) payload.removeLabelIds = removeLabelIds;

  try {
    ctx.log.debug(`Gmail ${action}: messageId=${messageId}`);
    const response = await ctx.client.post(
      `${GMAIL_API_BASE}/messages/${encodeURIComponent(messageId)}/modify`,
      payload
    );
    return {
      id: response.data.id,
      threadId: response.data.threadId,
      labelIds: response.data.labelIds ?? [],
    };
  } catch (error: unknown) {
    throwGmailError(error);
    throw error;
  }
};

/**
 * Shared implementation for trashMessage and untrashMessage. Both are
 * bodyless POSTs that differ only in the URL segment.
 */
const postMessageAction = async (
  ctx: ActionContext,
  action: string,
  messageId: string,
  segment: 'trash' | 'untrash'
): Promise<{ id: string; threadId: string; labelIds: string[] }> => {
  assertWriteCapableAuth(ctx, action);
  try {
    ctx.log.debug(`Gmail ${action}: messageId=${messageId}`);
    const response = await ctx.client.post(
      `${GMAIL_API_BASE}/messages/${encodeURIComponent(messageId)}/${segment}`,
      {}
    );
    return {
      id: response.data.id,
      threadId: response.data.threadId,
      labelIds: response.data.labelIds ?? [],
    };
  } catch (error: unknown) {
    throwGmailError(error);
    throw error;
  }
};

export const GmailConnector: ConnectorSpec = {
  metadata: {
    id: '.gmail',
    displayName: 'Gmail',
    description: i18n.translate('core.kibanaConnectorSpecs.gmail.metadata.description', {
      defaultMessage: 'Search, read, label, and send emails in Gmail',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder', 'contextEngine'],
  },

  auth: {
    types: [
      {
        type: 'ears',
        isRecommended: true,
        isExperimental: true,
        overrides: {
          meta: { scope: { disabled: true } },
        },
        defaults: {
          provider: 'google',
          // EARS scope is pinned to gmail.readonly — a platform limitation prevents
          // widening it. Write actions are not available with EARS auth.
          scope: 'https://www.googleapis.com/auth/gmail.readonly',
        },
      },
      {
        type: 'oauth_authorization_code',
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
            scope: { hidden: true },
          },
        },
        defaults: {
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          // gmail.modify covers reads, label changes, trash/untrash, and send.
          // Note: existing connectors authorized with gmail.readonly must be
          // re-authorized — Google does not re-prompt when the default scope changes.
          scope: 'https://www.googleapis.com/auth/gmail.modify',
        },
      },
      { type: 'bearer', isLegacy: true, defaults: {} },
    ],
    headers: {
      Accept: 'application/json',
    },
  },

  actions: {
    // ===== Read actions =====

    searchMessages: {
      isTool: true,
      scope: 'read',
      description:
        'Search for emails in Gmail. Use a specific query (from:, subject:, is:unread, after:, newer_than:Nd) and limit maxResults (e.g. 10-20) to avoid large responses.',
      input: SearchMessagesInputSchema,
      handler: async (ctx, input) => {
        const typedInput: SearchMessagesInput = SearchMessagesInputSchema.parse(input);
        const params: Record<string, string | number> = {
          maxResults: Math.min(typedInput.maxResults ?? DEFAULT_MAX_RESULTS, MAX_PAGE_SIZE),
        };
        if (typedInput.query) params.q = typedInput.query;
        if (typedInput.pageToken) params.pageToken = typedInput.pageToken;
        try {
          const response = await ctx.client.get(`${GMAIL_API_BASE}/messages`, { params });
          return {
            messages: response.data.messages ?? [],
            nextPageToken: response.data.nextPageToken,
            resultSizeEstimate: response.data.resultSizeEstimate,
          };
        } catch (error: unknown) {
          throwGmailError(error);
          throw error;
        }
      },
    },

    getMessage: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve one Gmail message by ID. You must call searchMessages or listMessages first to get message IDs, then pass one of those IDs here.',
      input: GetMessageInputSchema,
      handler: async (ctx, input) => {
        const typedInput: GetMessageInput = GetMessageInputSchema.parse(input);
        try {
          const response = await ctx.client.get(
            `${GMAIL_API_BASE}/messages/${encodeURIComponent(typedInput.messageId)}`,
            { params: { format: typedInput.format ?? 'minimal' } }
          );
          return response.data;
        } catch (error: unknown) {
          throwGmailError(error);
          throw error;
        }
      },
    },

    getAttachment: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve one Gmail attachment by message ID and attachment ID. Call getMessage with format "full" first to get attachment IDs from payload.parts[].body.attachmentId (and parts[].filename for the file name). WARNING: Attachment data is returned as base64url-encoded binary and may be large. Only call this action when you have a concrete plan to process the data (e.g. decode and index via an Elasticsearch attachment processor pipeline). Do not call it speculatively.',
      input: GetAttachmentInputSchema,
      handler: async (ctx, input) => {
        const typedInput: GetAttachmentInput = GetAttachmentInputSchema.parse(input);
        try {
          const response = await ctx.client.get(
            `${GMAIL_API_BASE}/messages/${encodeURIComponent(
              typedInput.messageId
            )}/attachments/${encodeURIComponent(typedInput.attachmentId)}`
          );
          return response.data;
        } catch (error: unknown) {
          throwGmailError(error);
          throw error;
        }
      },
    },

    listMessages: {
      isTool: true,
      scope: 'read',
      description:
        'List Gmail message IDs by label (e.g. INBOX, SENT). Prefer searchMessages when the user has a specific query; limit maxResults (e.g. 10-20) to keep context small.',
      input: ListMessagesInputSchema,
      handler: async (ctx, input) => {
        const typedInput: ListMessagesInput = ListMessagesInputSchema.parse(input);
        const params: Record<string, string | number | string[]> = {
          maxResults: Math.min(typedInput.maxResults ?? DEFAULT_MAX_RESULTS, MAX_PAGE_SIZE),
        };
        if (typedInput.pageToken) params.pageToken = typedInput.pageToken;
        if (typedInput.labelIds?.length) params.labelIds = typedInput.labelIds;
        try {
          // paramsSerializer: { indexes: null } serializes arrays as repeated keys
          // (labelIds=INBOX&labelIds=SENT) rather than axios's default bracketed form
          // (labelIds[]=INBOX), which Gmail rejects.
          const response = await ctx.client.get(`${GMAIL_API_BASE}/messages`, {
            params,
            paramsSerializer: { indexes: null },
          });
          return {
            messages: response.data.messages ?? [],
            nextPageToken: response.data.nextPageToken,
            resultSizeEstimate: response.data.resultSizeEstimate,
          };
        } catch (error: unknown) {
          throwGmailError(error);
          throw error;
        }
      },
    },

    // ===== Label and read-state actions =====

    listLabels: {
      isTool: true,
      scope: 'read',
      description:
        'List all Gmail labels (system and user-created) with their IDs and names. Call this before modifyLabels to resolve a label name (e.g. "Quarantine") to its ID.',
      input: ListLabelsInputSchema,
      handler: async (ctx) => {
        try {
          ctx.log.debug('Gmail listLabels');
          const response = await ctx.client.get(`${GMAIL_API_BASE}/labels`);
          return { labels: response.data.labels ?? [] };
        } catch (error: unknown) {
          throwGmailError(error);
          throw error;
        }
      },
    },

    modifyLabels: {
      // Requires OAuth 2.0 authorization code auth with gmail.modify scope.
      isTool: true,
      scope: 'destroy',
      description:
        'Add or remove Gmail labels on a message. This is the quarantine primitive: pass the quarantine label ID in addLabelIds and ["INBOX"] in removeLabelIds to move a message out of the inbox. Call listLabels first to resolve a label name to its ID. Roll back by swapping addLabelIds and removeLabelIds. At least one of addLabelIds or removeLabelIds is required. Not available with Elastic managed authentication.',
      input: ModifyLabelsInputSchema,
      output: ModifyMessageOutputSchema,
      handler: async (ctx, input) => {
        const typedInput: ModifyLabelsInput = ModifyLabelsInputSchema.parse(input);
        return modifyMessageLabels(ctx, 'modifyLabels', typedInput);
      },
    },

    markAsRead: {
      isTool: true,
      scope: 'destroy',
      description:
        'Mark a Gmail message as read by removing its UNREAD label. Reversible with markAsUnread. Returns the message id, threadId, and updated labelIds. Not available with Elastic managed authentication.',
      input: MessageIdInputSchema,
      output: ModifyMessageOutputSchema,
      handler: async (ctx, input) => {
        const typedInput: MessageIdInput = MessageIdInputSchema.parse(input);
        return modifyMessageLabels(ctx, 'markAsRead', {
          messageId: typedInput.messageId,
          removeLabelIds: [UNREAD_LABEL_ID],
        });
      },
    },

    markAsUnread: {
      isTool: true,
      scope: 'destroy',
      description:
        'Mark a Gmail message as unread by adding its UNREAD label. Reversible with markAsRead. Returns the message id, threadId, and updated labelIds. Not available with Elastic managed authentication.',
      input: MessageIdInputSchema,
      output: ModifyMessageOutputSchema,
      handler: async (ctx, input) => {
        const typedInput: MessageIdInput = MessageIdInputSchema.parse(input);
        return modifyMessageLabels(ctx, 'markAsUnread', {
          messageId: typedInput.messageId,
          addLabelIds: [UNREAD_LABEL_ID],
        });
      },
    },

    // ===== Quarantine and rollback actions =====

    trashMessage: {
      // Requires OAuth 2.0 authorization code auth with gmail.modify scope.
      // Gmail permanently purges trashed mail after 30 days.
      isTool: true,
      scope: 'destroy',
      description:
        'Move a Gmail message to Trash. Reversible with untrashMessage within 30 days; after that Gmail permanently deletes trashed mail. Distinct from a permanent delete, which is not supported by this connector. Not available with Elastic managed authentication.',
      input: MessageIdInputSchema,
      output: ModifyMessageOutputSchema,
      handler: async (ctx, input) => {
        const typedInput: MessageIdInput = MessageIdInputSchema.parse(input);
        return postMessageAction(ctx, 'trashMessage', typedInput.messageId, 'trash');
      },
    },

    untrashMessage: {
      // Requires OAuth 2.0 authorization code auth with gmail.modify scope.
      isTool: true,
      scope: 'destroy',
      description:
        'Restore a Gmail message from Trash. Rolls back a trashMessage call. Only effective within 30 days — Gmail permanently removes trashed mail after that period. Not available with Elastic managed authentication.',
      input: MessageIdInputSchema,
      output: ModifyMessageOutputSchema,
      handler: async (ctx, input) => {
        const typedInput: MessageIdInput = MessageIdInputSchema.parse(input);
        return postMessageAction(ctx, 'untrashMessage', typedInput.messageId, 'untrash');
      },
    },

    // ===== Compose actions =====

    sendMessage: {
      // Deliberately not a tool: sending mail from the user's own mailbox is
      // irreversible and leaves the organisation. A Slack message is internal
      // and deletable; an email is external, non-retractable once accepted by
      // the receiving MTA, and carries the user's identity to third parties.
      // Workflow steps only, so a human authored the send step.
      // Requires OAuth 2.0 authorization code auth with gmail.modify scope.
      isTool: true,
      scope: 'write',
      description:
        "Send an email from the authenticated user's Gmail account. Irreversible once accepted by the receiving mail server. Supports plain text and HTML bodies. No attachments in v1. Not available with Elastic managed authentication.",
      input: SendMessageInputSchema,
      output: SendMessageOutputSchema,
      handler: async (ctx, input) => {
        const typedInput: SendMessageInput = SendMessageInputSchema.parse(input);
        assertWriteCapableAuth(ctx, 'sendMessage');

        const raw = buildRawMessage({
          to: typedInput.to,
          subject: typedInput.subject,
          body: typedInput.body,
          bodyType: typedInput.bodyType,
          cc: typedInput.cc,
          bcc: typedInput.bcc,
        });

        try {
          ctx.log.debug('Gmail sendMessage');
          const response = await ctx.client.post(`${GMAIL_API_BASE}/messages/send`, { raw });
          return {
            id: response.data.id,
            threadId: response.data.threadId,
            labelIds: response.data.labelIds ?? [],
          };
        } catch (error: unknown) {
          throwGmailError(error);
          throw error;
        }
      },
    },

    replyMessage: {
      // Deliberately not a tool: same rationale as sendMessage — outbound email
      // is irreversible and leaves the organisation.
      // Requires OAuth 2.0 authorization code auth with gmail.modify scope.
      isTool: true,
      scope: 'write',
      description:
        'Send a reply to an existing Gmail message, preserving the thread. The handler fetches the original message to extract threading headers (In-Reply-To, References) and to determine the default reply-to address from Reply-To or From. Pass "to" explicitly to override the recipient. Not available with Elastic managed authentication.',
      input: ReplyMessageInputSchema,
      output: SendMessageOutputSchema,
      handler: async (ctx, input) => {
        const typedInput: ReplyMessageInput = ReplyMessageInputSchema.parse(input);
        assertWriteCapableAuth(ctx, 'replyMessage');

        // Fetch the original message to extract threading metadata.
        let original: {
          threadId?: string;
          payload?: { headers?: Array<{ name?: string; value?: string }> };
        };
        try {
          const fetchResponse = await ctx.client.get(
            `${GMAIL_API_BASE}/messages/${encodeURIComponent(typedInput.messageId)}`,
            // Use format=metadata (no metadataHeaders param — it's a repeated query
            // param and axios' default array serialization is rejected by Gmail).
            { params: { format: 'metadata' } }
          );
          original = fetchResponse.data;
        } catch (fetchError: unknown) {
          throwGmailError(fetchError);
          const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
          throw new Error(`Could not load the original message to reply to: ${msg}`);
        }

        const headers = original.payload?.headers;
        // findHeader is case-insensitive; a single call covers Message-Id, Message-ID, etc.
        const inReplyTo = findHeader(headers, 'Message-Id');
        const references = findHeader(headers, 'References');
        const originalSubject = findHeader(headers, 'Subject') ?? '';

        // Build the reply subject — prefix "Re: " unless already present.
        const replySubject =
          typedInput.subject ??
          (/^re:\s/i.test(originalSubject) ? originalSubject : `Re: ${originalSubject}`);

        // Determine the reply-to address.
        let toAddresses: string[];
        if (typedInput.to?.length) {
          toAddresses = typedInput.to;
        } else {
          const replyToHeader = findHeader(headers, 'Reply-To') ?? findHeader(headers, 'From');
          if (!replyToHeader) {
            throw new Error(
              'Could not determine a reply recipient from the original message; pass "to" explicitly.'
            );
          }
          const addrSpec = extractAddrSpec(replyToHeader);
          // Validate the extracted address is a bare addr-spec we can safely use.
          if (!GMAIL_EMAIL_REGEX.test(addrSpec)) {
            throw new Error(
              `Could not parse a valid email address from the original message's From/Reply-To header ("${replyToHeader}"). Pass "to" explicitly.`
            );
          }
          toAddresses = [addrSpec];
        }

        const raw = buildRawMessage({
          to: toAddresses,
          subject: replySubject,
          body: typedInput.body,
          bodyType: typedInput.bodyType,
          inReplyTo,
          references,
        });

        if (!original.threadId) {
          throw new Error(
            'The original message is missing a thread ID; cannot create a threaded reply.'
          );
        }

        try {
          ctx.log.debug(`Gmail replyMessage: threadId=${original.threadId}`);
          const response = await ctx.client.post(`${GMAIL_API_BASE}/messages/send`, {
            raw,
            threadId: original.threadId,
          });
          return {
            id: response.data.id,
            threadId: response.data.threadId,
            labelIds: response.data.labelIds ?? [],
          };
        } catch (error: unknown) {
          throwGmailError(error);
          throw error;
        }
      },
    },
  },

  test: {
    description: 'Verifies Gmail connection by fetching user profile',
    handler: async (ctx) => {
      ctx.log.debug('Gmail test handler');
      await ctx.client.get(`${GMAIL_API_BASE}/profile`);
      return {};
    },
    enabled: true,
  },

  skill: [
    '## Gmail connector — usage guide',
    '',
    '### Authentication and scope',
    '',
    'Read actions (`searchMessages`, `listMessages`, `getMessage`, `getAttachment`) work with any auth type.',
    '',
    'Write actions (`modifyLabels`, `markAsRead`, `markAsUnread`, `trashMessage`, `untrashMessage`, `sendMessage`, `replyMessage`) require the **OAuth 2.0 authorization code** auth type with a Google account that has granted the `gmail.modify` scope. They are **not available** with Elastic managed authentication, which is limited to `gmail.readonly`.',
    '',
    '> If a write action returns an error about insufficient scope, edit the connector and re-authorize it so Google issues an updated token.',
    '',
    '### Phishing quarantine workflow (multi-step)',
    '',
    '1. **Find the message** — call `searchMessages` with a query like `from:attacker@evil.tld is:unread` to get message IDs.',
    '2. **Inspect** (optional) — call `getMessage` with `format: "minimal"` for headers, or `format: "full"` for body and attachments.',
    '3. **Resolve the Quarantine label ID** — call `listLabels` and find the label named "Quarantine" in the response to get its ID (e.g. `Label_42`).',
    '4. **Quarantine** — call `modifyLabels` with `addLabelIds: ["Label_42"]` and `removeLabelIds: ["INBOX"]` to move the message out of the inbox.',
    '5. **Roll back** (if false positive) — call `modifyLabels` with `addLabelIds: ["INBOX"]` and `removeLabelIds: ["Label_42"]`, or call `untrashMessage` if the message was trashed.',
    '',
    '### Read workflow',
    '',
    '1. **Find messages** — call `searchMessages` (query-based) or `listMessages` (label-based) to get message IDs.',
    '2. **Read a message** — call `getMessage` with one of those IDs. Use `format: "minimal"` (default) for headers only; use `format: "full"` when the body or attachment metadata is needed.',
    '3. **Download an attachment** (optional) — call `getMessage` with `format: "full"` first, then call `getAttachment` with the `messageId` and an `attachmentId` from `payload.parts[].body.attachmentId`.',
    '',
    '### Notes',
    '',
    "- `sendMessage` and `replyMessage` are workflow steps only (not agent tools) — outbound email is irreversible, leaves the organisation, and carries the user's identity to third parties.",
    '- Permanent deletion is not supported — use `trashMessage` (reversible within 30 days).',
    '- `sendMessage` supports plain-text (`bodyType: "text"`) and HTML (`bodyType: "html"`) bodies, bare addr-spec recipients, and optional Cc/Bcc. No attachments in v1.',
    "- `replyMessage` automatically threads the reply using the original message's `Message-ID`, `References`, and `threadId`. Pass `to` explicitly to override the default reply-to address.",
  ].join('\n'),
};
