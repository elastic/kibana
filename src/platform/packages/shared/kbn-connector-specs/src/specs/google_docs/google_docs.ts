/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Google Docs MCP Connector
 *
 * An MCP-native connector backed by the official Google Docs MCP server
 * (docsmcp.googleapis.com). Exposes read and update operations on Google Docs
 * documents as tools consumable by AI agents.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient, callToolContent, callToolJson } from '../../lib/mcp';
import type { CallToolInput, ReadDocInput, UpdateDocInput } from './types';
import {
  CallToolInputSchema,
  ListToolsInputSchema,
  ReadDocInputSchema,
  UpdateDocInputSchema,
} from './types';

const GOOGLE_DOCS_MCP_SERVER_URL = 'https://docsmcp.googleapis.com/mcp/v1';

export const GoogleDocsConnector: ConnectorSpec = {
  metadata: {
    id: '.google_docs',
    displayName: 'Google Docs',
    description: i18n.translate('core.kibanaConnectorSpecs.googleDocs.metadata.description', {
      defaultMessage: 'Read and update documents in Google Docs',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. A follow-up PR will add 'workflows' and 'contextEngine'
    // once this connector is registered in every Production-NonCanary version.
    supportedFeatureIds: ['agentBuilder'],
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
          scope: 'https://www.googleapis.com/auth/documents',
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
          scope: 'https://www.googleapis.com/auth/documents',
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: UISchemas.url()
        .default(GOOGLE_DOCS_MCP_SERVER_URL)
        .describe('Google Docs MCP Server URL')
        .meta({
          widget: 'text',
          placeholder: 'https://docsmcp.googleapis.com/mcp/v1',
          hidden: true,
          label: i18n.translate('connectorSpecs.googleDocs.config.serverUrl.label', {
            defaultMessage: 'MCP Server URL',
          }),
          helpText: i18n.translate('connectorSpecs.googleDocs.config.serverUrl.helpText', {
            defaultMessage: 'The URL of the Google Docs MCP server.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    readDoc: {
      isTool: true,
      description:
        'Read the full content and structure of a Google Doc by its document ID. ' +
        'Returns a JSON representation of the document including body paragraphs, ' +
        'tables, lists, inline images, named styles, and document metadata. ' +
        'Use document IDs from search results, shared links, or URLs in the form ' +
        'docs.google.com/document/d/{document_id}/edit.',
      input: ReadDocInputSchema,
      handler: async (ctx, input: ReadDocInput) => {
        return callToolJson(ctx, 'read_doc', { documentId: input.document_id });
      },
    },

    updateDoc: {
      isTool: true,
      description:
        'Apply one or more batch updates to a Google Doc. Supports inserting or replacing text, ' +
        'formatting runs, managing bullet lists, inserting tables and rows, inserting images, ' +
        'adding comments, accepting or rejecting suggestions, and more. ' +
        'Each request in the array must contain exactly one operation key. ' +
        'Multiple requests are applied atomically in order. ' +
        'Read the document first with readDoc to obtain accurate character indices before ' +
        'constructing location-based requests such as insertText or deleteContentRange.',
      input: UpdateDocInputSchema,
      handler: async (ctx, input: UpdateDocInput) => {
        return callToolJson(ctx, 'update_doc', {
          documentId: input.document_id,
          requests: input.requests,
        });
      },
    },

    listTools: {
      isTool: true,
      description:
        'List all MCP tools exposed by the Google Docs MCP server. ' +
        'Use this to discover available capabilities or to refresh tool context for the agent.',
      input: ListToolsInputSchema,
      handler: async (ctx) => {
        return withMcpClient(ctx, async (mcp) => {
          const { tools } = await mcp.listTools();
          return tools;
        });
      },
    },

    callTool: {
      isTool: true,
      description:
        'Call any tool on the Google Docs MCP server directly by name. ' +
        'Use this as an escape hatch when a specific tool is not yet exposed as a named action. ' +
        'Use listTools first to discover available tool names.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
      },
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.googleDocs.test.description', {
      defaultMessage:
        'Verifies connection to the Google Docs MCP server by listing available tools.',
    }),
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        await mcp.listTools();
        return {};
      });
    },
    enabled: true,
  },

  skill: [
    'Google Docs connector — usage guidance for LLMs',
    '',
    '## Finding documents: use the Google Drive connector first',
    'This connector requires a document_id to call readDoc or updateDoc. It has no search or list',
    'capability of its own. To discover documents, use the Google Drive connector:',
    "  - searchFiles: find docs by content, name, owner, or date (add mimeType = 'application/vnd.google-apps.document')",
    "  - listFiles: browse a folder's contents",
    '  - getFileMetadata: get title, owner, sharing, timestamps for a known ID',
    'The document_id is the long alphanumeric string in the URL:',
    '  docs.google.com/document/d/{document_id}/edit',
    '',
    '## Read before writing',
    'Always call readDoc before constructing location-based update requests such as insertText or',
    'deleteContentRange. Document structure indices (character positions) are derived from the',
    'returned body content, and an incorrect index silently corrupts the wrong range.',
    '',
    '## Anatomy of a batchUpdate request',
    'Each entry in the requests array is a single-key object. The key names the operation; its',
    'value is the operation parameters. Example to append text after index 1:',
    '  {"insertText": {"location": {"index": 1}, "text": "New content"}}',
    'Example to bold a range of characters:',
    '  {"updateTextStyle": {"range": {"startIndex": 5, "endIndex": 15}, "textStyle": {"bold": true}, "fields": "bold"}}',
    '',
    '## replaceAllText is safest for content updates',
    'When the goal is to replace a known phrase throughout the document, prefer replaceAllText.',
    'It requires no index arithmetic and is immune to stale-index bugs from concurrent edits.',
    '',
    '## For tools not yet exposed as named actions',
    'Call listTools to discover available MCP tools, then use callTool to invoke them.',
  ].join('\n'),
};
