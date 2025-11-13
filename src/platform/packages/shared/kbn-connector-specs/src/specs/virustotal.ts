/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Example: VirusTotal Connector
 *
 * This demonstrates a threat intelligence connector with:
 * - File hash scanning (MD5, SHA-1, SHA-256)
 * - URL analysis and scanning
 * - File submission for analysis
 * - IP address reputation lookups
 *
 * MVP implementation focusing on core threat intelligence actions.
 */

import { z } from '@kbn/zod';
import type { ConnectorSpec } from '../connector_spec';
import { UISchemas } from '../connector_spec_ui';

export const VirusTotalConnector: ConnectorSpec = {
  metadata: {
    id: '.virustotal',
    displayName: 'VirusTotal',
    icon: `data:image/png;base64,${getIconPngBase64()}`,
    description: 'File scanning, URL analysis, and threat intelligence lookups',
    minimumLicense: 'gold',
    supportedFeatureIds: ['alerting', 'siem'],
  },

  schema: z.discriminatedUnion('method', [
    z.object({
      method: z.literal('headers'),
      headers: z.object({
        'x-apikey': UISchemas.secret('vt-...').describe('API Key'),
      }),
    }),
  ]),

  actions: {
    scanFileHash: {
      isTool: true,
      input: z.object({
        hash: z.string().min(32).describe('File hash (MD5, SHA-1, or SHA-256)'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { hash: string };
        const response = await ctx.client.get(
          `https://www.virustotal.com/api/v3/files/${typedInput.hash}`
        );
        return {
          id: response.data.data.id,
          attributes: response.data.data.attributes,
          stats: response.data.data.attributes.last_analysis_stats,
        };
      },
    },

    scanUrl: {
      isTool: true,
      input: z.object({
        url: z.string().url().describe('URL to scan'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { url: string };
        const submitResponse = await ctx.client.post(
          'https://www.virustotal.com/api/v3/urls',
          new URLSearchParams({ url: typedInput.url }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
        const analysisId = submitResponse.data.data.id;
        const analysisResponse = await ctx.client.get(
          `https://www.virustotal.com/api/v3/analyses/${analysisId}`
        );
        return {
          id: analysisId,
          status: analysisResponse.data.data.attributes.status,
          stats: analysisResponse.data.data.attributes.stats,
        };
      },
    },

    submitFile: {
      isTool: true,
      input: z.object({
        file: z.string().describe('Base64-encoded file content'),
        filename: z.string().optional().describe('Original filename'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { file: string; filename?: string };
        const buffer = Buffer.from(typedInput.file, 'base64');
        const formData = new FormData();
        formData.append('file', new Blob([buffer]), typedInput.filename || 'file');

        const response = await ctx.client.post('https://www.virustotal.com/api/v3/files', formData);
        return {
          id: response.data.data.id,
          type: response.data.data.type,
          links: response.data.data.links,
        };
      },
    },

    getIpReport: {
      isTool: true,
      input: z.object({
        ip: z.string().ip().describe('IP address'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { ip: string };
        const response = await ctx.client.get(
          `https://www.virustotal.com/api/v3/ip_addresses/${typedInput.ip}`
        );
        return {
          id: response.data.data.id,
          attributes: response.data.data.attributes,
          reputation: response.data.data.attributes.reputation,
          country: response.data.data.attributes.country,
        };
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        await ctx.client.get('https://www.virustotal.com/api/v3/ip_addresses/8.8.8.8');
        return {
          ok: true,
          message: 'Successfully connected to VirusTotal API',
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect: ${error}`,
        };
      }
    },
    description: 'Verifies VirusTotal API key',
  },
};

function getIconPngBase64() {
  return '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';
}
