/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Azure Blob Storage Connector
 *
 * Integrates with Azure Blob Storage via the Blob Service REST API.
 * Supports listing containers, listing blobs, getting blob content/properties.
 * Auth: Shared Key (storage account name + account key).
 *
 * @see https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';

const AZURE_BLOB_API_VERSION = '2021-06-08';

function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/%2F/gi, '/');
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractNextMarker(xml: string): string | undefined {
  const match = xml.match(/<NextMarker>([^<]*)<\/NextMarker>/);
  // An empty <NextMarker/> means no more pages; || undefined coerces '' to undefined intentionally.
  return match?.[1] || undefined;
}

/**
 * Extracts and throws a meaningful error from Azure Blob Storage API responses.
 * Uses the x-ms-error-code response header when available for a human-readable code.
 */
const AxiosErrorSchema = z.object({
  response: z
    .object({
      status: z.number().optional(),
      headers: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  message: z.string().optional(),
});

function createAzureBlobError(error: unknown): Error {
  const parsed = AxiosErrorSchema.safeParse(error);
  const axiosError = parsed.success ? parsed.data : {};
  const status = axiosError.response?.status;
  const errorCode = axiosError.response?.headers?.['x-ms-error-code'];
  if (status != null) {
    const detail = errorCode ? ` ${errorCode}` : '';
    return new Error(`Azure Blob Storage error (${status}${detail})`);
  }
  return new Error(axiosError.message ?? 'Unknown Azure Blob Storage error');
}

function getBaseUrl(ctx: ActionContext): string {
  const url = (ctx.config?.accountUrl as string)?.trim() ?? '';
  return url.replace(/\/+$/, '');
}

function parseListContainersXml(xml: string): {
  containers: Array<{ name: string }>;
  nextMarker?: string;
} {
  const containers: Array<{ name: string }> = [];
  const containerBlockRegex = /<Container>(.*?)<\/Container>/gs;
  const containerBlocks = xml.match(containerBlockRegex) ?? [];
  for (const block of containerBlocks) {
    const nameMatch = block.match(/<Name>([^<]*)<\/Name>/);
    if (nameMatch?.[1]) containers.push({ name: decodeXmlEntities(nameMatch[1]) });
  }
  return {
    containers,
    nextMarker: extractNextMarker(xml),
  };
}

function parseListBlobsXml(xml: string): {
  blobs: Array<{ name: string; contentLength?: number; lastModified?: string }>;
  nextMarker?: string;
} {
  const blobs: Array<{ name: string; contentLength?: number; lastModified?: string }> = [];
  const blobBlockRegex = /<Blob>(.*?)<\/Blob>/gs;
  const blobBlocks = xml.match(blobBlockRegex) ?? [];
  for (const block of blobBlocks) {
    const nameMatch = block.match(/<Name>([^<]*)<\/Name>/);
    const propertiesMatch = block.match(/<Properties>(.*?)<\/Properties>/s);
    const properties = propertiesMatch?.[1] ?? '';
    const lengthMatch = properties.match(/<Content-Length>([^<]*)<\/Content-Length>/);
    const lastModMatch = properties.match(/<Last-Modified>([^<]*)<\/Last-Modified>/);
    blobs.push({
      name: decodeXmlEntities(nameMatch?.[1] ?? ''),
      contentLength: lengthMatch?.[1] ? parseInt(lengthMatch[1], 10) : undefined,
      lastModified: lastModMatch?.[1],
    });
  }
  return {
    blobs,
    nextMarker: extractNextMarker(xml),
  };
}

export const AzureBlob: ConnectorSpec = {
  metadata: {
    id: '.azure-blob',
    displayName: 'Azure Blob Storage',
    description: i18n.translate('core.kibanaConnectorSpecs.azureBlob.metadata.description', {
      defaultMessage:
        'Connect to Azure Blob Storage to list containers and blobs, and retrieve blob content.',
    }),
    isTechnicalPreview: true,
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['azure_shared_key'],
    headers: {
      'x-ms-version': AZURE_BLOB_API_VERSION,
    },
  },

  schema: z.object({
    accountUrl: z
      .string()
      .min(1)
      .describe(
        i18n.translate('core.kibanaConnectorSpecs.azureBlob.config.accountUrl.description', {
          defaultMessage: 'Azure Blob Storage account URL',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.azureBlob.config.accountUrl.label', {
          defaultMessage: 'Storage account URL',
        }),
        placeholder: 'https://myaccount.blob.core.windows.net',
        helpText: i18n.translate('core.kibanaConnectorSpecs.azureBlob.config.accountUrl.helpText', {
          defaultMessage:
            'The blob service endpoint, for example https://myaccount.blob.core.windows.net.',
        }),
      }),
  }),

  actions: {
    listContainers: {
      isTool: true,
      description:
        'List all containers in the Azure Blob Storage account. Supports optional prefix filtering and cursor-based pagination via marker.',
      input: z.object({
        prefix: z
          .string()
          .optional()
          .describe(
            'Optional prefix to filter containers by name. Only containers whose names begin with this string are returned.'
          ),
        maxresults: z
          .number()
          .optional()
          .describe('Maximum number of containers to return. Omit to use the service default.'),
        marker: z
          .string()
          .optional()
          .describe(
            'Pagination cursor returned as nextMarker from a previous listContainers response. Pass this to retrieve the next page.'
          ),
      }),
      handler: async (ctx, input) => {
        try {
          const baseUrl = getBaseUrl(ctx);
          const response = await ctx.client.get(`${baseUrl}/`, {
            params: {
              comp: 'list',
              ...(input.prefix && { prefix: input.prefix }),
              ...(input.maxresults != null && { maxresults: input.maxresults }),
              ...(input.marker && { marker: input.marker }),
            },
            responseType: 'text',
          });
          const xml = response.data as string;
          return parseListContainersXml(xml);
        } catch (err) {
          throw createAzureBlobError(err);
        }
      },
    },

    listBlobs: {
      isTool: true,
      description:
        'List blobs inside a specific Azure Blob Storage container. Supports optional prefix filtering and cursor-based pagination.',
      input: z.object({
        container: z
          .string()
          .describe('The name of the container to list blobs from. Example: "my-container"'),
        prefix: z
          .string()
          .optional()
          .describe(
            'Optional prefix to filter blobs by name. Only blobs whose names begin with this string are returned. Example: "logs/2024/"'
          ),
        maxresults: z
          .number()
          .optional()
          .describe('Maximum number of blobs to return. Omit to use the service default.'),
        marker: z
          .string()
          .optional()
          .describe(
            'Pagination cursor returned as nextMarker from a previous listBlobs response. Pass this to retrieve the next page.'
          ),
      }),
      handler: async (ctx, input) => {
        try {
          const baseUrl = getBaseUrl(ctx);
          const container = encodePathSegment(input.container);
          const response = await ctx.client.get(`${baseUrl}/${container}`, {
            params: {
              restype: 'container',
              comp: 'list',
              ...(input.prefix && { prefix: input.prefix }),
              ...(input.maxresults != null && { maxresults: input.maxresults }),
              ...(input.marker && { marker: input.marker }),
            },
            responseType: 'text',
          });
          const xml = response.data as string;
          return parseListBlobsXml(xml);
        } catch (err) {
          throw createAzureBlobError(err);
        }
      },
    },

    getBlob: {
      isTool: true,
      description:
        'Download the full content of a blob from Azure Blob Storage, returned as base64. Always call getBlobProperties first to check contentLength — do not call this if the blob exceeds 1048576 bytes (1 MB).',
      input: z.object({
        container: z
          .string()
          .describe('The name of the container that holds the blob. Example: "my-container"'),
        blobName: z
          .string()
          .describe(
            'The full name (path) of the blob to download. Example: "logs/2024/january.log"'
          ),
      }),
      handler: async (ctx, input) => {
        try {
          const baseUrl = getBaseUrl(ctx);
          const container = encodePathSegment(input.container);
          const response = await ctx.client.get(
            `${baseUrl}/${container}/${encodePathSegment(input.blobName)}`,
            { responseType: 'arraybuffer' }
          );
          const buffer = Buffer.from(response.data as ArrayBuffer);
          return {
            contentBase64: buffer.toString('base64'),
            contentType: response.headers['content-type'] as string | undefined,
            contentLength: buffer.length,
          };
        } catch (err) {
          throw createAzureBlobError(err);
        }
      },
    },

    getBlobProperties: {
      isTool: true,
      description:
        'Get metadata for a blob (content type, size, last modified, etag) without downloading its content. Call this before getBlob to check whether the blob is small enough to download (limit: 1048576 bytes / 1 MB).',
      input: z.object({
        container: z
          .string()
          .describe('The name of the container that holds the blob. Example: "my-container"'),
        blobName: z
          .string()
          .describe(
            'The full name (path) of the blob to inspect. Example: "logs/2024/january.log"'
          ),
      }),
      handler: async (ctx, input) => {
        try {
          const baseUrl = getBaseUrl(ctx);
          const container = encodePathSegment(input.container);
          const response = await ctx.client.head(
            `${baseUrl}/${container}/${encodePathSegment(input.blobName)}`
          );
          return {
            contentType: response.headers['content-type'],
            contentLength: response.headers['content-length']
              ? parseInt(String(response.headers['content-length']), 10)
              : undefined,
            lastModified: response.headers['last-modified'],
            etag: response.headers.etag,
          };
        } catch (err) {
          throw createAzureBlobError(err);
        }
      },
    },
  },

  skill: [
    'Use this connector to explore and retrieve content from Azure Blob Storage.',
    '',
    '## Browsing',
    'To list all containers: listContainers (no required inputs).',
    'To list blobs in a known container: listBlobs(container).',
    'If you have a container name, always use listBlobs. Only use listContainers when the container name is unknown.',
    '',
    '## Retrieving blob content',
    'Always call getBlobProperties before getBlob to check the blob size.',
    'If contentLength > 1048576 bytes (1 MB), do not call getBlob — inform the user the blob is too large to download.',
    'If contentLength <= 1048576 or contentLength is unknown, call getBlob to retrieve the content (returned as base64).',
    '',
    '## Pagination',
    'Both listContainers and listBlobs return a nextMarker field when more results exist.',
    'Pass nextMarker as marker in the next call to retrieve the following page.',
    'Use maxresults to control page size.',
  ].join('\n'),

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.azureBlob.test.description', {
      defaultMessage: 'Verifies Azure Blob connection by listing containers with maxresults=1',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Azure Blob test handler');
      try {
        const baseUrl = getBaseUrl(ctx);
        if (!baseUrl) {
          return { ok: false, message: 'Storage account URL is required' };
        }
        await ctx.client.get(`${baseUrl}/`, {
          params: { comp: 'list', maxresults: 1 },
          responseType: 'text',
        });
        return { ok: true, message: 'Successfully connected to Azure Blob Storage' };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, message };
      }
    },
  },
};
