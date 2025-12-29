/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Jina Reader Connector
 *
 * MVP implementation focusing on core reader features.
 */

import { z } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';

const JINA_READER_TITLE = 'Jina Reader';
const JINA_READER_CONNECTOR_ID = '.jina';

enum RETURN_FORMAT {
  HTML = 'html',
  MARKDOWN = 'markdown',
  FULL_MARKDOWN = 'fullMarkdown',
  PLAIN_TEXT = 'plainText',
  SCREENSHOT = '1stScreenScreenshot',
  FULL_SCREENSHOT = 'fullPageScreenshot',
}

const JINA_READER_BROWSE_URL = 'https://r.jina.ai' as const;
const JINA_READER_SEARCH_URL = 'https://s.jina.ai' as const;

function mapPluginReturnFormatToReaderReturnFormat(returnFormat?: RETURN_FORMAT): string {
  switch (returnFormat) {
    case RETURN_FORMAT.HTML:
      return 'html';
    case RETURN_FORMAT.MARKDOWN:
      return 'content';
    case RETURN_FORMAT.FULL_MARKDOWN:
      return 'markdown';
    case RETURN_FORMAT.PLAIN_TEXT:
      return 'text';
    case RETURN_FORMAT.SCREENSHOT:
      return 'screenshot';
    case RETURN_FORMAT.FULL_SCREENSHOT:
      return 'pageshot';
    default:
      return 'content';
  }
}

export const JinaReaderConnector: ConnectorSpec = {
  metadata: {
    id: JINA_READER_CONNECTOR_ID,
    displayName: JINA_READER_TITLE,
    description: 'Any URL to markdown, web search for better LLM grounding',
    minimumLicense: 'gold',
    docsUrl: 'https://jina.ai/reader',
    supportedFeatureIds: ['workflows', 'generativeAIForSearchPlayground'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          meta: {
            token: {
              label: 'Jina API Key',
              placeholder: 'jina_...',
              description: 'Your Jina Reader API key',
            },
          },
        },
      },
    ],
  },

  schema: z.object({
    overrideBrowseUrl: UISchemas.url()
      .optional()
      .default(JINA_READER_BROWSE_URL)
      .describe('Override Jina Reader Browse URL')
      .meta({
        widget: 'text',
        label: 'Browse URL',
        placeholder: JINA_READER_BROWSE_URL,
      }),
    overrideSearchUrl: UISchemas.url()
      .optional()
      .default(JINA_READER_SEARCH_URL)
      .describe('Override Jina Reader Search URL')
      .meta({
        widget: 'text',
        label: 'Search URL',
        placeholder: JINA_READER_SEARCH_URL,
      }),
    MCP: z
      .enum(['Enabled', 'Disabled'])
      .optional()
      .default('Disabled')
      .describe('Enable MCP tools for Jina Reader')
      .meta({
        widget: 'select',
        label: 'MCP Integration',
        placeholder: 'Enable MCP tools for Jina Reader',
      }),
  }),

  actions: {
    browse: {
      isTool: true,
      description: 'Turn any URL to markdown for LLM consumption',
      input: z.object({
        url: z.string().min(3).describe('URL to browse'),
        returnFormat: z
          .enum([
            RETURN_FORMAT.MARKDOWN,
            RETURN_FORMAT.FULL_MARKDOWN,
            RETURN_FORMAT.PLAIN_TEXT,
            RETURN_FORMAT.SCREENSHOT,
            RETURN_FORMAT.FULL_SCREENSHOT,
            RETURN_FORMAT.HTML,
          ])
          .optional()
          .describe('Desired return format'),
        options: z.record(z.string(), z.any()).optional().describe('Additional advanced options'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          url: string;
          returnFormat?: RETURN_FORMAT;
          options?: Record<string, unknown>;
        };
        const response = await ctx.client.post(
          (ctx.config?.overrideBrowseUrl as string | undefined) || JINA_READER_BROWSE_URL,
          {
            url: typedInput.url,
            respondWith: mapPluginReturnFormatToReaderReturnFormat(typedInput.returnFormat),
            ...typedInput.options,
          },
          {
            headers: { Accept: 'application/json' },
          }
        );
        return response.data?.data
          ? { ok: true, ...response.data.data, external: undefined }
          : { ok: false, ...response.data };
      },
    },
    search: {
      isTool: true,
      description: 'Web search to find relevant context for LLMs',
      input: z.object({
        query: z.string().min(1).describe('Search query'),
        returnFormat: z
          .enum([RETURN_FORMAT.MARKDOWN, RETURN_FORMAT.FULL_MARKDOWN, RETURN_FORMAT.PLAIN_TEXT])
          .optional()
          .describe('Desired return format'),
        options: z.record(z.string(), z.any()).optional().describe('Additional advanced options'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query: string;
          returnFormat?: RETURN_FORMAT;
          options?: Record<string, unknown>;
        };
        const response = await ctx.client.post(
          (ctx.config?.overrideSearchUrl as string | undefined) || JINA_READER_SEARCH_URL,
          {
            q: typedInput.query,
            respondWith: typedInput.returnFormat
              ? mapPluginReturnFormatToReaderReturnFormat(typedInput.returnFormat)
              : 'no-content',
            ...typedInput.options,
          },
          {
            headers: { Accept: 'application/json' },
          }
        );
        return response.data?.data
          ? { ok: true, results: response.data.data }
          : { ok: false, ...response.data };
      },
    },
    fileToMarkdown: {
      isTool: true,
      description: 'Convert a file to markdown for LLM consumption',
      input: z.object({
        file: z.string().describe('Base64-encoded file content'),
        filename: z.string().optional().describe('Original filename'),
        options: z.record(z.string(), z.any()).optional().describe('Additional advanced options'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          file: string;
          filename?: string;
          options?: Record<string, unknown>;
        };
        const buffer = Buffer.from(typedInput.file, 'base64');
        const formData = new FormData();
        formData.append('file', new Blob([buffer]), typedInput.filename || 'file.bin');
        for (const [key, value] of Object.entries(typedInput.options || {})) {
          formData.append(key, `${value}`);
        }
        const response = await ctx.client.post(
          (ctx.config?.overrideBrowseUrl as string | undefined) || JINA_READER_BROWSE_URL,
          formData,
          {
            headers: { Accept: 'application/json' },
          }
        );
        return response.data?.data
          ? { ok: true, ...response.data.data }
          : { ok: false, ...response.data };
      },
    },
    fileToRenderedImage: {
      isTool: true,
      description: 'Render a document file to image. Office and PDF files supported.',
      input: z.object({
        file: z.string().describe('Base64-encoded file content'),
        filename: z.string().optional().describe('Original filename'),
        pageNumber: z.number().optional().describe('Page number to render (starting from 1)'),
        options: z.record(z.string(), z.any()).optional().describe('Additional advanced options'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          file: string;
          filename?: string;
          pageNumber?: number;
          options?: Record<string, unknown>;
        };
        const buffer = Buffer.from(typedInput.file, 'base64');
        const formData = new FormData();
        formData.append('file', new Blob([buffer]), typedInput.filename || 'file.bin');
        for (const [key, value] of Object.entries(typedInput.options || {})) {
          formData.set(key, `${value}`);
        }
        if (typedInput.pageNumber && typedInput.pageNumber > 1) {
          formData.set('url', `blob:-#${typedInput.pageNumber}`);
        }
        formData.set('respondWith', 'screenshot');
        const response = await ctx.client.post(
          (ctx.config?.overrideBrowseUrl as string | undefined) || JINA_READER_BROWSE_URL,
          formData,
          {
            headers: { Accept: 'application/json' },
          }
        );
        return response.data?.data
          ? { ok: true, ...response.data.data }
          : { ok: false, ...response.data };
      },
    },

    listTools: {
      isTool: false,
      description: 'Lists available Jina Reader tools (MCP)',
      input: z.object().optional(),
      handler: async () => {
        return {
          tools: [
            {
              name: 'browse',
              description: 'Turn any URL to markdown/image for LLM consumption',
              inputSchema: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    description: 'URL to browse',
                  },
                  returnFormat: {
                    type: 'string',
                    description: 'Desired return format',
                    enum: [
                      RETURN_FORMAT.MARKDOWN,
                      RETURN_FORMAT.FULL_MARKDOWN,
                      RETURN_FORMAT.PLAIN_TEXT,
                      RETURN_FORMAT.SCREENSHOT,
                      RETURN_FORMAT.FULL_SCREENSHOT,
                      RETURN_FORMAT.HTML,
                    ],
                    default: RETURN_FORMAT.MARKDOWN,
                  },
                  options: {
                    type: 'object',
                    description:
                      'Additional advanced options. Refer to https://r.jina.ai/openapi.json for details.',
                    additionalProperties: true,
                  },
                },
                required: ['url'],
              },
            },
            {
              name: 'web-search',
              description: 'Web search to find relevant context for LLMs',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search query',
                  },
                },
                required: ['query'],
              },
            },
          ],
        };
      },
    },

    callTool: {
      isTool: false,
      description: 'Call Jina Reader tools (MCP)',
      input: z.object({
        name: z.string().describe('Name of the tool to call'),
        arguments: z.record(z.string(), z.any()).optional().describe('Arguments for the tool call'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          name: string;
          arguments?: Record<string, unknown>;
        };

        if (typedInput.name.includes('browse')) {
          const innerTypedInput = typedInput.arguments as {
            url: string;
            returnFormat?: RETURN_FORMAT;
            options?: Record<string, unknown>;
          };
          const response = await ctx.client.post(
            (ctx.config?.overrideBrowseUrl as string | undefined) || JINA_READER_BROWSE_URL,
            {
              url: innerTypedInput.url,
              respondWith: mapPluginReturnFormatToReaderReturnFormat(innerTypedInput.returnFormat),
              ...innerTypedInput.options,
            },
            {
              headers: { Accept: 'application/json' },
            }
          );

          const effectiveData = response.data?.data;
          if (!effectiveData) {
            throw new Error(response.data?.readableMessage || JSON.stringify(response.data));
          }

          // const urlLike = effectiveData.pageshotUrl || effectiveData.screenshotUrl;
          // if (urlLike) {
          //   const imageResponse = await ctx.client.get(urlLike, {
          //     responseType: 'arraybuffer',
          //     maxContentLength: 10 * 1024 * 1024,
          //   });
          //   const base64Image = Buffer.from(imageResponse.data).toString('base64');
          //   return {
          //     content: [
          //       {
          //         type: 'image',
          //         data: base64Image,
          //         mimeType: imageResponse.headers['content-type'],
          //       },
          //     ],
          //     structuredContent: effectiveData,
          //     isError: false,
          //   };
          // }

          const chunks = [
            `Title: ${effectiveData.title || 'N/A'}`,
            `Metadata: ${JSON.stringify(effectiveData.metadata || {})}`,
            effectiveData.content || effectiveData.text || effectiveData.markdown || '',
          ];

          const effectiveContent = chunks.join('\n\n');

          return {
            content: [{ type: 'text', text: effectiveContent }],
            structuredContent: effectiveData,
            isError: false,
          };
        }
        if (typedInput.name.includes('search')) {
          const innerTypedInput = typedInput.arguments as {
            query: string;
            returnFormat?: RETURN_FORMAT;
            options?: Record<string, unknown>;
          };
          const response = await ctx.client.post(
            (ctx.config?.overrideSearchUrl as string | undefined) || JINA_READER_BROWSE_URL,
            {
              q: innerTypedInput.query,
              respondWith: 'no-content',
              ...innerTypedInput.options,
            },
            {
              headers: { Accept: 'text/plain' },
            }
          );
          const effectiveData = response.data;
          if (typeof effectiveData !== 'string') {
            throw new Error(response.data?.readableMessage || JSON.stringify(response.data));
          }
          return {
            content: [{ type: 'text', text: effectiveData.toString() }],
            isError: false,
          };
        }

        throw new Error(`Unknown tool: ${typedInput.name}`);
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        const r = await ctx.client.get(
          (ctx.config?.overrideBrowseUrl as string | undefined) || JINA_READER_BROWSE_URL
        );
        return {
          ok: true,
          message: `Successfully connected to Jina Reader API: \n${r.data}`,
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect: ${error}`,
        };
      }
    },
    description: 'Verifies Jina Reader API connectivity',
  },
};
