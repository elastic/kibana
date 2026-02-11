/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Example: Shodan Connector
 *
 * This demonstrates an asset discovery connector with:
 * - Host and service searching
 * - Detailed host information
 * - Result counting
 * - Service enumeration
 *
 * MVP implementation focusing on core asset discovery actions.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';

export const ShodanConnector: ConnectorSpec = {
  metadata: {
    id: '.shodan',
    displayName: 'Shodan',
    description: i18n.translate('connectorSpecs.shodan.metadata.description', {
      defaultMessage: 'Internet-wide asset discovery and vulnerability scanning',
    }),
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [{ type: 'api_key_header', defaults: { headerField: 'X-Api-Key' } }],
  },

  actions: {
    searchHosts: {
      isTool: true,
      input: z.object({
        query: z.string().describe('Search query'),
        page: z.number().int().min(1).optional().default(1).describe('Page number'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { query: string; page?: number };
        const apiKey = ctx.secrets?.authType === 'api_key_header' ? ctx.secrets['X-Api-Key'] : '';
        const response = await ctx.client.get('https://api.shodan.io/shodan/host/search', {
          params: {
            query: typedInput.query,
            page: typedInput.page || 1,
            key: apiKey,
          },
        });
        return {
          matches: response.data.matches,
          total: response.data.total,
          facets: response.data.facets,
        };
      },
    },

    getHostInfo: {
      isTool: true,
      input: z.object({
        ip: z.ipv4().describe('IP address'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { ip: string };
        const apiKey = ctx.secrets?.authType === 'api_key_header' ? ctx.secrets['X-Api-Key'] : '';
        const response = await ctx.client.get(
          `https://api.shodan.io/shodan/host/${typedInput.ip}`,
          {
            params: { key: apiKey },
          }
        );
        return {
          ip: response.data.ip_str,
          ports: response.data.ports,
          hostnames: response.data.hostnames,
          city: response.data.city,
          country: response.data.country_name,
          org: response.data.org,
          data: response.data.data,
        };
      },
    },

    countResults: {
      isTool: true,
      input: z.object({
        query: z.string().describe('Search query'),
        facets: z.string().optional().describe('Facets to include'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { query: string; facets?: string };
        const apiKey = ctx.secrets?.authType === 'api_key_header' ? ctx.secrets['X-Api-Key'] : '';
        const response = await ctx.client.get('https://api.shodan.io/shodan/host/count', {
          params: {
            query: typedInput.query,
            ...(typedInput.facets && { facets: typedInput.facets }),
            key: apiKey,
          },
        });
        return {
          total: response.data.total,
          facets: response.data.facets,
        };
      },
    },

    getServices: {
      isTool: true,
      input: z.object({}),
      handler: async (ctx) => {
        const apiKey = ctx.secrets?.authType === 'api_key_header' ? ctx.secrets['X-Api-Key'] : '';
        const response = await ctx.client.get('https://api.shodan.io/shodan/services', {
          params: { key: apiKey },
        });
        return {
          services: response.data,
        };
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        const apiKey = ctx.secrets?.authType === 'api_key_header' ? ctx.secrets['X-Api-Key'] : '';
        await ctx.client.get('https://api.shodan.io/shodan/host/8.8.8.8', {
          params: { key: apiKey },
        });
        return {
          ok: true,
          message: 'Successfully connected to Shodan API',
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect: ${error}`,
        };
      }
    },
    description: i18n.translate('connectorSpecs.shodan.test.description', {
      defaultMessage: 'Verifies Shodan API key',
    }),
  },
};
