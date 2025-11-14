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

import { z } from '@kbn/zod';
import type { ConnectorSpec } from '../connector_spec';
import { UISchemas } from '../connector_spec_ui';

export const ShodanConnector: ConnectorSpec = {
  metadata: {
    id: '.shodan',
    displayName: 'Shodan',
    description: 'Internet-wide asset discovery and vulnerability scanning',
    minimumLicense: 'gold',
    supportedFeatureIds: ['alerting', 'siem'],
  },

  schema: z.discriminatedUnion('method', [
    z.object({
      method: z.literal('headers'),
      headers: z.object({
        'X-Api-Key': UISchemas.secret().describe('API Key'),
      }),
    }),
  ]),

  actions: {
    searchHosts: {
      isTool: true,
      input: z.object({
        query: z.string().describe('Search query'),
        page: z.number().int().min(1).optional().default(1).describe('Page number'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { query: string; page?: number };
        const apiKey = ctx.auth.method === 'headers' ? ctx.auth.headers['X-Api-Key'] : '';
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
        ip: z.string().ip().describe('IP address'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { ip: string };
        const apiKey = ctx.auth.method === 'headers' ? ctx.auth.headers['X-Api-Key'] : '';
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
        const apiKey = ctx.auth.method === 'headers' ? ctx.auth.headers['X-Api-Key'] : '';
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
        const apiKey = ctx.auth.method === 'headers' ? ctx.auth.headers['X-Api-Key'] : '';
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
        const apiKey = ctx.auth.method === 'headers' ? ctx.auth.headers['X-Api-Key'] : '';
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
    description: 'Verifies Shodan API key',
  },
};
