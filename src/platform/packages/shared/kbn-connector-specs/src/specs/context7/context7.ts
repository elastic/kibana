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
import { UISchemas } from '../../connector_spec';

const CONTEXT7_DEFAULT_URL = 'https://mcp.context7.com/mcp';

const ResolveLibraryInputSchema = z.object({
  libraryName: z
    .string()
    .min(1)
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.context7.actions.resolveLibrary.input.libraryName.description',
        { defaultMessage: 'Library or package name to search for (e.g. "react", "next.js")' }
      )
    ),
  query: z
    .string()
    .min(1)
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.context7.actions.resolveLibrary.input.query.description',
        {
          defaultMessage:
            'What you need help with — used to rank results by relevance (e.g. "How to set up authentication")',
        }
      )
    ),
});

const QueryDocsInputSchema = z.object({
  libraryId: z
    .string()
    .min(1)
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.context7.actions.queryDocs.input.libraryId.description',
        {
          defaultMessage:
            'Context7 library ID in /org/project format (e.g. "/vercel/next.js"). Obtain via resolveLibrary first.',
        }
      )
    ),
  query: z
    .string()
    .min(1)
    .describe(
      i18n.translate(
        'core.kibanaConnectorSpecs.context7.actions.queryDocs.input.query.description',
        {
          defaultMessage:
            'Specific question about the library (e.g. "React useEffect cleanup function examples")',
        }
      )
    ),
});

/**
 * Context7 v2 connector — retrieves up-to-date library documentation and
 * code examples via the Context7 MCP server. Uses the v2 framework's MCP
 * client support for automatic connection lifecycle, auth, and SSL/proxy.
 */
export const Context7: ConnectorSpec = {
  metadata: {
    id: '.context7',
    displayName: 'Context7',
    description: i18n.translate('core.kibanaConnectorSpecs.context7.metadata.description', {
      defaultMessage:
        'Retrieve up-to-date documentation and code examples for any programming library via Context7',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [{ type: 'api_key_header', defaults: { headerField: 'CONTEXT7_API_KEY' } }, 'none'],
  },

  schema: z.object({
    serverUrl: UISchemas.url()
      .default(CONTEXT7_DEFAULT_URL)
      .meta({
        label: i18n.translate('core.kibanaConnectorSpecs.context7.config.serverUrl.label', {
          defaultMessage: 'Context7 MCP Server URL',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.context7.config.serverUrl.helpText', {
          defaultMessage:
            'The Streamable HTTP endpoint for the Context7 MCP server. Defaults to the official endpoint.',
        }),
      }),
  }),

  mcp: {
    urlField: 'serverUrl',
  },

  actions: {
    resolveLibrary: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.context7.actions.resolveLibrary.description',
        {
          defaultMessage:
            'Resolve a library/package name to a Context7 library ID. Call this before queryDocs to obtain the correct library ID.',
        }
      ),
      input: ResolveLibraryInputSchema,
      handler: async (ctx, input) => {
        if (!ctx.mcpClient) {
          throw new Error('MCP client not available');
        }
        const result = await ctx.mcpClient.callTool({
          name: 'resolve-library-id',
          arguments: {
            libraryName: input.libraryName,
            query: input.query,
          },
        });
        return result;
      },
    },

    queryDocs: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.context7.actions.queryDocs.description',
        {
          defaultMessage:
            'Query up-to-date documentation and code examples for a library. Requires a Context7 library ID from resolveLibrary.',
        }
      ),
      input: QueryDocsInputSchema,
      handler: async (ctx, input) => {
        if (!ctx.mcpClient) {
          throw new Error('MCP client not available');
        }
        const result = await ctx.mcpClient.callTool({
          name: 'query-docs',
          arguments: {
            libraryId: input.libraryId,
            query: input.query,
          },
        });
        return result;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.context7.test.description', {
      defaultMessage: 'Verify connection to Context7 by resolving a known library',
    }),
    handler: async (ctx) => {
      if (!ctx.mcpClient) {
        return { ok: false, message: 'MCP client not available' };
      }
      try {
        const result = await ctx.mcpClient.callTool({
          name: 'resolve-library-id',
          arguments: { libraryName: 'react', query: 'React documentation' },
        });
        const hasContent = result.content.length > 0;
        return {
          ok: hasContent,
          message: hasContent
            ? i18n.translate('core.kibanaConnectorSpecs.context7.test.successMessage', {
                defaultMessage: 'Successfully connected to Context7 MCP server',
              })
            : 'Connected but received empty response',
        };
      } catch (error) {
        const err = error as { message?: string };
        return { ok: false, message: err.message ?? 'Unknown error' };
      }
    },
  },
};
