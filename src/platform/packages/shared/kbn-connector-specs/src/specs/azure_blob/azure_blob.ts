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
import searchWorkflow from './workflows/search.yaml';
import listBlobsWorkflow from './workflows/list_blobs.yaml';
import listContainersWorkflow from './workflows/list_containers.yaml';
import getBlobWorkflow from './workflows/get_blob.yaml';

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
  return match?.[1] || undefined;
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
    const lengthMatch = block.match(/<Content-Length>([^<]*)<\/Content-Length>/);
    const lastModMatch = block.match(/<Last-Modified>([^<]*)<\/Last-Modified>/);
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
      isTool: false,
      input: z.object({
        prefix: z.string().optional(),
        maxresults: z.number().optional(),
        marker: z.string().optional(),
      }),
      handler: async (ctx, input) => {
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
      },
    },

    listBlobs: {
      isTool: false,
      input: z.object({
        container: z.string(),
        prefix: z.string().optional(),
        maxresults: z.number().optional(),
        marker: z.string().optional(),
      }),
      handler: async (ctx, input) => {
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
      },
    },

    getBlob: {
      isTool: false,
      input: z.object({
        container: z.string(),
        blobName: z.string(),
      }),
      handler: async (ctx, input) => {
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
      },
    },

    getBlobProperties: {
      isTool: false,
      input: z.object({
        container: z.string(),
        blobName: z.string(),
      }),
      handler: async (ctx, input) => {
        const baseUrl = getBaseUrl(ctx);
        const container = encodePathSegment(input.container);

        let response;
        try {
          response = await ctx.client.head(
            `${baseUrl}/${container}/${encodePathSegment(input.blobName)}`
          );
        } catch (err) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 404) {
            throw new Error(`Blob not found: ${input.container}/${input.blobName}`);
          }
          throw err;
        }
        return {
          contentType: response.headers['content-type'],
          contentLength: response.headers['content-length']
            ? parseInt(String(response.headers['content-length']), 10)
            : undefined,
          lastModified: response.headers['last-modified'],
          etag: response.headers.etag,
        };
      },
    },
  },

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

  agentBuilderWorkflows: [
    searchWorkflow,
    listBlobsWorkflow,
    listContainersWorkflow,
    getBlobWorkflow,
  ],
};
