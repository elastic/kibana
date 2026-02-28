/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Outlook Connector
 *
 * This connector provides integration with Microsoft Outlook via
 * the Microsoft Graph API. Features include:
 * - Searching messages across mailboxes
 * - Listing mail folders
 * - Retrieving individual messages by ID
 * - Listing messages within a folder
 *
 * Requires OAuth2 client credentials authentication with Microsoft Entra ID.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

/**
 * Common output schema for Microsoft Graph API responses that return a collection.
 * Uses z.any() for the array items to avoid over-specifying the response structure.
 */
const GraphCollectionOutputSchema = z.object({
  value: z.array(z.any()).describe('Array of items returned from the API'),
  '@odata.nextLink': z.string().optional().describe('URL to fetch next page of results'),
});

export const Outlook: ConnectorSpec = {
  metadata: {
    id: '.outlook',
    displayName: 'Outlook',
    description: i18n.translate('core.kibanaConnectorSpecs.outlook.metadata.description', {
      defaultMessage: 'Kibana Stack Connector for Microsoft Outlook via the Microsoft Graph API.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        defaults: {
          scope: 'https://graph.microsoft.com/.default',
          tokenUrl: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
        },
        overrides: {
          meta: {
            scope: { hidden: true },
          },
        },
      },
    ],
  },

  actions: {
    searchMessages: {
      isTool: true,
      description: 'Search for messages across all mailboxes using Microsoft Graph Search API.',
      input: z.object({
        query: z.string().describe('Search query string (KQL syntax supported)'),
        from: z.number().optional().describe('Offset for pagination'),
        size: z.number().optional().describe('Number of results to return (max 25)'),
      }),
      output: z.any(),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query: string;
          from?: number;
          size?: number;
        };

        ctx.log.debug(`Outlook searching messages with query: ${typedInput.query}`);

        const searchRequest = {
          requests: [
            {
              entityTypes: ['message'],
              query: {
                queryString: typedInput.query,
              },
              ...(typedInput.from !== undefined && { from: typedInput.from }),
              ...(typedInput.size !== undefined && { size: typedInput.size }),
            },
          ],
        };

        const response = await ctx.client.post(
          'https://graph.microsoft.com/v1.0/search/query',
          searchRequest
        );
        return response.data;
      },
    },

    listMailFolders: {
      isTool: true,
      description: 'List mail folders for a user.',
      input: z.object({
        userId: z.string().describe('User ID or user principal name (e.g., user@contoso.com)'),
      }),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as {
          userId: string;
        };

        ctx.log.debug(`Outlook listing mail folders for user ${typedInput.userId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/users/${typedInput.userId}/mailFolders`,
          {
            params: {
              $select:
                'id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount',
              $top: 50,
            },
          }
        );
        return response.data;
      },
    },

    listMessages: {
      isTool: true,
      description:
        'List messages in a mail folder. Defaults to the Inbox if no folder ID is provided.',
      input: z.object({
        userId: z.string().describe('User ID or user principal name (e.g., user@contoso.com)'),
        folderId: z
          .string()
          .optional()
          .describe('Mail folder ID. Defaults to Inbox if omitted.'),
        top: z.number().optional().describe('Number of messages to return (max 50)'),
        skip: z.number().optional().describe('Number of messages to skip for pagination'),
        filter: z
          .string()
          .optional()
          .describe('OData $filter expression (e.g., "isRead eq false")'),
      }),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as {
          userId: string;
          folderId?: string;
          top?: number;
          skip?: number;
          filter?: string;
        };

        const folder = typedInput.folderId ?? 'Inbox';
        ctx.log.debug(
          `Outlook listing messages for user ${typedInput.userId} in folder ${folder}`
        );

        const params: Record<string, string | number> = {
          $select:
            'id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,importance',
          $orderby: 'receivedDateTime desc',
          $top: typedInput.top ?? 25,
        };

        if (typedInput.skip !== undefined) {
          params.$skip = typedInput.skip;
        }
        if (typedInput.filter) {
          params.$filter = typedInput.filter;
        }

        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/users/${typedInput.userId}/mailFolders/${folder}/messages`,
          { params }
        );
        return response.data;
      },
    },

    getMessage: {
      isTool: true,
      description: 'Retrieve a specific message by ID, including full body content.',
      input: z.object({
        userId: z.string().describe('User ID or user principal name (e.g., user@contoso.com)'),
        messageId: z.string().describe('Message ID'),
      }),
      output: z.any(),
      handler: async (ctx, input) => {
        const typedInput = input as {
          userId: string;
          messageId: string;
        };

        ctx.log.debug(
          `Outlook getting message ${typedInput.messageId} for user ${typedInput.userId}`
        );
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/users/${typedInput.userId}/messages/${typedInput.messageId}`,
          {
            params: {
              $select:
                'id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,body,importance,categories,conversationId',
            },
          }
        );
        return response.data;
      },
    },

    searchUserMessages: {
      isTool: true,
      description:
        'Search messages within a specific user mailbox using OData $search query parameter.',
      input: z.object({
        userId: z.string().describe('User ID or user principal name (e.g., user@contoso.com)'),
        query: z
          .string()
          .describe(
            'Search query string. Supports KQL-like syntax for subject, body, from fields.'
          ),
        top: z.number().optional().describe('Number of results to return (max 25)'),
      }),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as {
          userId: string;
          query: string;
          top?: number;
        };

        ctx.log.debug(
          `Outlook searching messages for user ${typedInput.userId} with query: ${typedInput.query}`
        );

        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/users/${typedInput.userId}/messages`,
          {
            params: {
              $search: `"${typedInput.query}"`,
              $select:
                'id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,importance',
              $top: typedInput.top ?? 25,
            },
          }
        );
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.outlook.test.description', {
      defaultMessage:
        'Verifies Outlook connection by checking Microsoft Graph API access.',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Outlook test handler');

      try {
        const response = await ctx.client.get('https://graph.microsoft.com/v1.0/');
        const displayName = response.data.displayName || 'Unknown';
        return {
          ok: true,
          message: `Successfully connected to Microsoft Graph API: ${displayName}`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { ok: false, message };
      }
    },
  },
};
