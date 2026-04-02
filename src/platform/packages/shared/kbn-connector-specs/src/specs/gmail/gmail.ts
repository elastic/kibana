/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import getAttachmentWorkflow from './workflows/get_attachment.yaml';
import getMessageWorkflow from './workflows/get_message.yaml';
import listMessagesWorkflow from './workflows/list_messages.yaml';
import searchWorkflow from './workflows/search.yaml';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const DEFAULT_MAX_RESULTS = 10;
const MAX_PAGE_SIZE = 100;

function throwGmailError(error: unknown): void {
  const axiosError = error as {
    response?: { data?: { error?: { message?: string; code?: number } } };
  };
  const gmailError = axiosError.response?.data?.error;
  if (gmailError) {
    throw new Error(
      `Gmail API error (${gmailError.code ?? 'unknown'}): ${gmailError.message ?? 'Unknown'}`
    );
  }
}

export const GmailConnector: ConnectorSpec = {
  metadata: {
    id: '.gmail',
    displayName: 'Gmail',
    description: 'Search and read emails from Gmail',
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },
  auth: {
    types: [
      'bearer',
      {
        type: 'oauth_authorization_code',
        overrides: {
          meta: {
            scope: { disabled: true },
          },
        },
        defaults: {
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scope: 'https://www.googleapis.com/auth/gmail.readonly',
        },
      },
    ],
    headers: {
      Accept: 'application/json',
    },
  },
  actions: {
    searchMessages: {
      isTool: true,
      input: z.object({
        query: z
          .string()
          .optional()
          .describe(
            'Gmail search query. Use specific operators to narrow results and avoid large responses: from:, to:, subject:, is:unread, is:read, after:YYYY/MM/DD, before:YYYY/MM/DD, newer_than:Nd, has:attachment. Example: "from:alice@example.com is:unread newer_than:7d". Prefer narrow queries; do not search without filters.'
          ),
        maxResults: z
          .number()
          .optional()
          .default(DEFAULT_MAX_RESULTS)
          .describe(
            'Maximum number of message IDs to return (1-100). Prefer 10-20 to keep context small; increase only if user explicitly needs more.'
          ),
        pageToken: z.string().optional().describe('Token for pagination from a previous response'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query?: string;
          maxResults?: number;
          pageToken?: string;
        };
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
      input: z.object({
        messageId: z
          .string()
          .min(1, { message: 'messageId is required to retrieve a Gmail message' })
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
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { messageId: string; format?: string };
        try {
          const response = await ctx.client.get(
            `${GMAIL_API_BASE}/messages/${typedInput.messageId}`,
            {
              params: { format: typedInput.format ?? 'minimal' },
            }
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
      input: z.object({
        messageId: z
          .string()
          .min(1, { message: 'messageId is required to retrieve an attachment' })
          .describe(
            'Required. The Gmail message ID (from getMessage or search/list). Get attachment IDs from getMessage with format "full" — see payload.parts[].body.attachmentId.'
          ),
        attachmentId: z
          .string()
          .min(1, { message: 'attachmentId is required to retrieve an attachment' })
          .describe(
            'Required. The attachment ID from the message. Call getMessage with format "full" and read payload.parts[].body.attachmentId (and parts[].filename for the file name).'
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { messageId: string; attachmentId: string };
        try {
          const response = await ctx.client.get(
            `${GMAIL_API_BASE}/messages/${typedInput.messageId}/attachments/${typedInput.attachmentId}`
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
      input: z.object({
        maxResults: z
          .number()
          .optional()
          .default(DEFAULT_MAX_RESULTS)
          .describe(
            'Maximum number of message IDs to return (1-100). Prefer 10-20 to keep context small.'
          ),
        pageToken: z.string().optional().describe('Token for pagination from a previous response'),
        labelIds: z
          .array(z.string())
          .optional()
          .describe('Only return messages with these label IDs (e.g. INBOX, SENT)'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          maxResults?: number;
          pageToken?: string;
          labelIds?: string[];
        };
        const params: Record<string, string | number | string[]> = {
          maxResults: Math.min(typedInput.maxResults ?? DEFAULT_MAX_RESULTS, MAX_PAGE_SIZE),
        };
        if (typedInput.pageToken) params.pageToken = typedInput.pageToken;
        if (typedInput.labelIds?.length) params.labelIds = typedInput.labelIds;
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
  },
  test: {
    description: 'Verifies Gmail connection by fetching user profile',
    handler: async (ctx) => {
      ctx.log.debug('Gmail test handler');
      try {
        const response = await ctx.client.get(`${GMAIL_API_BASE}/profile`);
        if (response.status !== 200) {
          return {
            ok: false,
            message: 'Failed to connect to Gmail API',
          };
        }
        const emailAddress = response.data?.emailAddress ?? 'user';
        return {
          ok: true,
          message: `Successfully connected to Gmail as ${emailAddress}`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          ok: false,
          message: `Failed to connect to Gmail API: ${errorMessage}`,
        };
      }
    },
  },
  agentBuilderWorkflows: [
    getAttachmentWorkflow,
    getMessageWorkflow,
    listMessagesWorkflow,
    searchWorkflow,
  ],
};
