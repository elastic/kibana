/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import {
  SearchMessagesInputSchema,
  ListMessagesInputSchema,
  GetMessageInputSchema,
  GetAttachmentInputSchema,
  ListAttachmentsInputSchema,
  ListFoldersInputSchema,
} from './types';
import type {
  SearchMessagesInput,
  ListMessagesInput,
  GetMessageInput,
  GetAttachmentInput,
  ListAttachmentsInput,
  ListFoldersInput,
} from './types';

/**
 * Returns the base path for user-scoped Microsoft Graph API endpoints.
 * When a userId is provided, returns `/users/{userId}` (for app-only auth).
 * Otherwise, returns `/me` (for delegated auth with a signed-in user).
 */
const userPath = (userId?: string): string => (userId ? `/users/${userId}` : '/me');

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const GraphCollectionOutputSchema = z.object({
  value: z.array(z.any()).describe('Array of items returned from the API'),
  '@odata.nextLink': z.string().optional().describe('URL to fetch next page of results'),
  '@odata.count': z.number().optional().describe('Total count of items (if requested)'),
});

export const Outlook: ConnectorSpec = {
  metadata: {
    id: '.outlook',
    displayName: 'Outlook',
    description: i18n.translate('core.kibanaConnectorSpecs.outlook.metadata.description', {
      defaultMessage: 'Search emails, list folders, and read messages and attachments in Outlook',
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
          meta: {
            token: {
              label: i18n.translate('core.kibanaConnectorSpecs.outlook.auth.bearer.token.label', {
                defaultMessage: 'Microsoft API token',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.outlook.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'A Microsoft Bearer token obtained via delegated OAuth flow (for example, a user access token from the Authorization Code flow).',
                }
              ),
            },
          },
        },
      },
      {
        type: 'oauth_client_credentials',
        defaults: {
          scope: 'https://graph.microsoft.com/.default',
        },
        overrides: {
          meta: {
            scope: { hidden: true },
            tokenUrl: {
              label: i18n.translate('core.kibanaConnectorSpecs.outlook.auth.oauth.tokenUrl.label', {
                defaultMessage: 'Token URL',
              }),
              placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.outlook.auth.oauth.tokenUrl.helpText',
                {
                  defaultMessage:
                    "Replace ''{tenantId}'' with your Azure AD tenant ID. For example: https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token",
                  values: { tenantId: '{tenant-id}' },
                }
              ),
            },
          },
        },
      },
    ],
  },

  actions: {
    // https://learn.microsoft.com/en-us/graph/search-concept-messages
    searchMessages: {
      isTool: true,
      description:
        "Search Outlook emails using the Microsoft Graph Search API with KQL syntax. Supports filtering by sender, subject, body content, attachment presence, and date ranges. With delegated auth (bearer token), searches the signed-in user's mailbox. With app-only auth (client credentials), searches across the entire tenant. Returns hits with message ID, subject, sender, received date, and a short summary.",
      input: SearchMessagesInputSchema,
      output: z.any(),
      handler: async (ctx, input: SearchMessagesInput) => {
        const searchRequest = {
          requests: [
            {
              entityTypes: ['message'],
              query: {
                queryString: input.query,
              },
              ...(input.from !== undefined && { from: input.from }),
              ...(input.size !== undefined && { size: input.size }),
            },
          ],
        };

        ctx.log.debug('Outlook searching messages');
        const response = await ctx.client.post(`${GRAPH_BASE}/search/query`, searchRequest);
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/user-list-messages
    listMessages: {
      isTool: true,
      description:
        'List Outlook email messages from the inbox or a specific folder. Returns message metadata including id, subject, sender, receivedDateTime, isRead, and hasAttachments. Use searchMessages when you have a keyword query; use listMessages when you want to browse a folder or apply OData filters. With delegated auth, omit userId. With app-only auth, userId is required.',
      input: ListMessagesInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListMessagesInput) => {
        if (ctx.secrets?.authType === 'oauth_client_credentials' && !input.userId) {
          throw new Error(
            'listMessages requires a userId when using app-only (client credentials) auth. ' +
              'Provide the userId or UPN of the user whose messages you want to list.'
          );
        }

        const base = userPath(input.userId);
        const folderSegment = input.folderId ? `/mailFolders/${input.folderId}` : '';
        const url = `${GRAPH_BASE}${base}${folderSegment}/messages`;

        ctx.log.debug(`Outlook listing messages from ${url}`);
        const response = await ctx.client.get(url, {
          params: {
            $select:
              'id,subject,from,toRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,bodyPreview,conversationId,importance,webLink',
            $top: input.top,
            ...(input.filter && { $filter: input.filter }),
            ...(input.orderby
              ? { $orderby: input.orderby }
              : { $orderby: 'receivedDateTime desc' }),
          },
        });
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/message-get
    getMessage: {
      isTool: true,
      description:
        'Retrieve the full details of a single Outlook email message by ID, including the HTML or text body. Use listMessages or searchMessages to discover message IDs. With delegated auth, omit userId. With app-only auth, userId is required.',
      input: GetMessageInputSchema,
      output: z.any(),
      handler: async (ctx, input: GetMessageInput) => {
        if (ctx.secrets?.authType === 'oauth_client_credentials' && !input.userId) {
          throw new Error(
            'getMessage requires a userId when using app-only (client credentials) auth. ' +
              'Provide the userId or UPN of the user who owns the message.'
          );
        }

        const base = userPath(input.userId);
        const url = `${GRAPH_BASE}${base}/messages/${input.messageId}`;

        ctx.log.debug(`Outlook getting message ${input.messageId}`);
        const response = await ctx.client.get(url, {
          params: {
            $select:
              'id,subject,from,toRecipients,ccRecipients,bccRecipients,replyTo,receivedDateTime,sentDateTime,isRead,hasAttachments,body,bodyPreview,conversationId,importance,webLink,internetMessageId',
          },
        });
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/message-list-attachments
    listAttachments: {
      isTool: true,
      description:
        'List the attachments on an Outlook email message. Returns attachment metadata including id, name, contentType, size, and isInline. Use this before calling getAttachment to discover attachment IDs.',
      input: ListAttachmentsInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListAttachmentsInput) => {
        if (ctx.secrets?.authType === 'oauth_client_credentials' && !input.userId) {
          throw new Error(
            'listAttachments requires a userId when using app-only (client credentials) auth. ' +
              'Provide the userId or UPN of the user who owns the message.'
          );
        }

        const base = userPath(input.userId);
        const url = `${GRAPH_BASE}${base}/messages/${input.messageId}/attachments`;

        ctx.log.debug(`Outlook listing attachments for message ${input.messageId}`);
        const response = await ctx.client.get(url, {
          params: {
            $select: 'id,name,contentType,size,isInline,lastModifiedDateTime',
          },
        });
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/attachment-get
    getAttachment: {
      isTool: true,
      description:
        'Download an attachment from an Outlook email message. Returns the attachment content as a base64-encoded string (contentBytes). WARNING: Attachment content can be large; only call this when you have a plan to process the binary data (for example, via an Elasticsearch ingest pipeline attachment processor). Use listAttachments first to get the attachment ID and verify the content type and size before downloading.',
      input: GetAttachmentInputSchema,
      output: z.object({
        id: z.string().describe('Attachment ID'),
        name: z.string().describe('File name of the attachment'),
        contentType: z.string().describe('MIME type of the attachment'),
        size: z.number().describe('Size of the attachment in bytes'),
        contentBytes: z.string().describe('Base64-encoded content of the attachment'),
        isInline: z.boolean().optional().describe('Whether the attachment is inline'),
      }),
      handler: async (ctx, input: GetAttachmentInput) => {
        if (ctx.secrets?.authType === 'oauth_client_credentials' && !input.userId) {
          throw new Error(
            'getAttachment requires a userId when using app-only (client credentials) auth. ' +
              'Provide the userId or UPN of the user who owns the message.'
          );
        }

        const base = userPath(input.userId);
        const url = `${GRAPH_BASE}${base}/messages/${input.messageId}/attachments/${input.attachmentId}`;

        ctx.log.debug(
          `Outlook getting attachment ${input.attachmentId} from message ${input.messageId}`
        );
        const response = await ctx.client.get(url);
        return response.data;
      },
    },

    // https://learn.microsoft.com/en-us/graph/api/user-list-mailfolders
    listFolders: {
      isTool: true,
      description:
        'List the mail folders in an Outlook mailbox, including well-known folders (inbox, sentitems, drafts, deleteditems, junkemail) and custom folders. Returns folder id, displayName, totalItemCount, and unreadItemCount. Use folder IDs with listMessages to browse a specific folder.',
      input: ListFoldersInputSchema,
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input: ListFoldersInput) => {
        if (ctx.secrets?.authType === 'oauth_client_credentials' && !input.userId) {
          throw new Error(
            'listFolders requires a userId when using app-only (client credentials) auth. ' +
              'Provide the userId or UPN of the user whose folders you want to list.'
          );
        }

        const base = userPath(input.userId);
        const url = `${GRAPH_BASE}${base}/mailFolders`;

        ctx.log.debug('Outlook listing mail folders');
        const response = await ctx.client.get(url, {
          params: {
            $select: 'id,displayName,totalItemCount,unreadItemCount,isHidden,parentFolderId',
            includeHiddenFolders: input.includeHidden ? 'true' : undefined,
          },
        });
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.outlook.test.description', {
      defaultMessage: 'Verifies Outlook connection by fetching mailbox information',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Outlook test handler');

      try {
        const isAppOnly = ctx.secrets?.authType === 'oauth_client_credentials';

        if (isAppOnly) {
          // App-only: verify we can reach the Graph API by listing service root info
          await ctx.client.get(`${GRAPH_BASE}/`);
          return {
            ok: true,
            message: 'Successfully connected to Outlook (app-only auth)',
          };
        }

        // Delegated: fetch the signed-in user's profile
        const response = await ctx.client.get(`${GRAPH_BASE}/me`, {
          params: { $select: 'displayName,mail,userPrincipalName' },
        });
        const displayName =
          response.data?.displayName ??
          response.data?.mail ??
          response.data?.userPrincipalName ??
          'user';
        return {
          ok: true,
          message: `Successfully connected to Outlook as ${displayName}`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { ok: false, message };
      }
    },
  },

  skill: [
    '## Outlook Connector Usage Guide',
    '',
    '### Multi-step patterns',
    '',
    '**Search and read emails:**',
    '1. Call `searchMessages` with a KQL query (e.g. `subject:budget Q4`, `from:alice@contoso.com is:unread`) to find matching messages.',
    '2. Call `getMessage` with a message ID from the search results to read the full email body.',
    '',
    '**Browse a folder:**',
    '1. Call `listFolders` to discover folder IDs (e.g. inbox, sentitems, or custom folders).',
    '2. Call `listMessages` with a `folderId` to list messages in that folder.',
    '3. Call `getMessage` with a message ID to read a specific email.',
    '',
    '**Download an attachment:**',
    '1. Call `listMessages` or `searchMessages` to find a message with `hasAttachments: true`.',
    '2. Call `listAttachments` with the message ID to see attachment names, types, and sizes.',
    '3. Call `getAttachment` with the message ID and attachment ID only when you need the binary content.',
    '   WARNING: `getAttachment` returns a potentially large base64-encoded payload — only call it when there is a plan to process the data.',
    '',
    '### Auth mode differences',
    '- **Delegated auth (bearer token):** Operates as the signed-in user. Omit `userId` on all actions.',
    '- **App-only auth (client credentials):** No signed-in user context. `userId` (UPN or GUID) is REQUIRED on all actions except `searchMessages`, which searches across the entire tenant.',
    '',
    '### Useful OData filters for listMessages',
    '- Unread only: `isRead eq false`',
    "- From a sender: `from/emailAddress/address eq 'alice@contoso.com'`",
    '- After a date: `receivedDateTime ge 2024-01-01T00:00:00Z`',
    '- Has attachments: `hasAttachments eq true`',
    '',
    '### Well-known folder names',
    'Use these names in `folderId` without looking up IDs: `inbox`, `sentitems`, `drafts`, `deleteditems`, `junkemail`.',
    '',
    '### KQL search operators',
    'For `searchMessages`, common operators: `from:`, `subject:`, `body:`, `hasAttachments:true`, `sent:`, `received:`, AND/OR/NOT.',
  ].join('\n'),
};
