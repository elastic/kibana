/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Example: AlienVault OTX Connector
 *
 * This demonstrates a community threat intelligence connector with:
 * - Indicator lookups (IP, domain, hash, URL)
 * - Threat pulse searching
 * - Pulse details retrieval
 * - Related pulse discovery
 *
 * MVP implementation focusing on core community intelligence actions.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';

export const AlienVaultOTXConnector: ConnectorSpec = {
  metadata: {
    id: '.alienvault-otx',
    displayName: 'AlienVault OTX',
    description: i18n.translate('connectorSpecs.alienvaultOtx.metadata.description', {
      defaultMessage: 'Community-driven threat intelligence from Open Threat Exchange',
    }),
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [{ type: 'api_key_header', defaults: { headerField: 'X-OTX-API-KEY' } }],
  },

  actions: {
    getIndicator: {
      isTool: true,
      input: z.object({
        indicatorType: z
          .enum([
            'IPv4',
            'IPv6',
            'domain',
            'hostname',
            'url',
            'FileHash-MD5',
            'FileHash-SHA1',
            'FileHash-SHA256',
          ])
          .describe('Indicator type'),
        indicator: z.string().describe('Indicator value'),
        section: z.string().optional().describe('Specific section to retrieve'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { indicatorType: string; indicator: string; section?: string };
        const section = typedInput.section || 'general';
        const response = await ctx.client.get(
          `https://otx.alienvault.com/api/v1/indicators/${typedInput.indicatorType}/${typedInput.indicator}/${section}`
        );
        return {
          indicator: typedInput.indicator,
          type: typedInput.indicatorType,
          data: response.data,
        };
      },
    },

    searchPulses: {
      isTool: true,
      input: z.object({
        query: z.string().optional().describe('Search query'),
        page: z.number().int().min(1).optional().default(1).describe('Page number'),
        limit: z.number().int().min(1).max(100).optional().default(20).describe('Results per page'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { query?: string; page?: number; limit?: number };
        const response = await ctx.client.get(
          'https://otx.alienvault.com/api/v1/pulses/subscribed',
          {
            params: {
              ...(typedInput.query && { q: typedInput.query }),
              page: typedInput.page || 1,
              limit: typedInput.limit || 20,
            },
          }
        );
        return {
          count: response.data.count,
          results: response.data.results,
          next: response.data.next,
        };
      },
    },

    getPulse: {
      isTool: true,
      input: z.object({
        pulseId: z.string().describe('Pulse ID'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { pulseId: string };
        const response = await ctx.client.get(
          `https://otx.alienvault.com/api/v1/pulses/${typedInput.pulseId}`
        );
        return {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
          author: response.data.author_name,
          created: response.data.created,
          modified: response.data.modified,
          tags: response.data.tags,
          indicators: response.data.indicators,
        };
      },
    },

    getRelatedPulses: {
      isTool: true,
      input: z.object({
        indicatorType: z
          .enum([
            'IPv4',
            'IPv6',
            'domain',
            'hostname',
            'url',
            'FileHash-MD5',
            'FileHash-SHA1',
            'FileHash-SHA256',
          ])
          .describe('Indicator type'),
        indicator: z.string().describe('Indicator value'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { indicatorType: string; indicator: string };
        const response = await ctx.client.get(
          `https://otx.alienvault.com/api/v1/indicators/${typedInput.indicatorType}/${typedInput.indicator}/pulses`
        );
        return {
          indicator: typedInput.indicator,
          count: response.data.count,
          pulses: response.data.results,
        };
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        await ctx.client.get('https://otx.alienvault.com/api/v1/pulses/subscribed', {
          params: { limit: 1 },
        });
        return {
          ok: true,
          message: 'Successfully connected to AlienVault OTX API',
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect: ${error}`,
        };
      }
    },
    description: i18n.translate('connectorSpecs.alienvaultOtx.test.description', {
      defaultMessage: 'Verifies AlienVault OTX API key',
    }),
  },
};
