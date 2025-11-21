/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Example: URLVoid Connector
 *
 * This demonstrates a domain reputation connector with:
 * - Domain reputation scanning
 * - URL safety checking
 * - Domain information retrieval
 * - API usage statistics
 *
 * MVP implementation focusing on core domain reputation actions.
 */

import { z } from '@kbn/zod/v4';

import type { ConnectorSpec } from '../connector_spec';

export const URLVoidConnector: ConnectorSpec = {
  metadata: {
    id: '.urlvoid',
    displayName: 'URLVoid',
    description: 'Domain and URL reputation checking via multi-engine scanning',
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },

  authTypes: [
    {
      type: 'api_key_header',
      defaults: {
        headerField: 'X-Api-Key',
      },
    },
  ],

  actions: {
    scanDomain: {
      isTool: true,
      input: z.object({
        domain: z.string().describe('Domain name to scan'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { domain: string };
        // const apiKey = ctx.secrets['X-Api-Key'] || '';
        const apiKey = ctx.auth.method === 'headers' ? ctx.auth.headers['X-Api-Key'] : '';
        const response = await ctx.client.get(
          `https://api.urlvoid.com/api1000/${apiKey}/host/${typedInput.domain}`
        );
        return {
          domain: typedInput.domain,
          reputation: response.data.reputation,
          detections: response.data.detections,
          engines: response.data.engines,
        };
      },
    },

    checkUrl: {
      isTool: true,
      input: z.object({
        url: z.url().describe('URL to check'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { url: string };
        const domain = new URL(typedInput.url).hostname;
        const apiKey = ctx.auth.method === 'headers' ? ctx.auth.headers['X-Api-Key'] : '';
        const response = await ctx.client.get(
          `https://api.urlvoid.com/api1000/${apiKey}/host/${domain}`
        );
        return {
          url: typedInput.url,
          domain,
          reputation: response.data.reputation,
          detections: response.data.detections,
          engines: response.data.engines,
        };
      },
    },

    getDomainInfo: {
      isTool: true,
      input: z.object({
        domain: z.string().describe('Domain name'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { domain: string };
        const apiKey = ctx.auth.method === 'headers' ? ctx.auth.headers['X-Api-Key'] : '';
        const response = await ctx.client.get(
          `https://api.urlvoid.com/api1000/${apiKey}/host/${typedInput.domain}`
        );
        return {
          domain: typedInput.domain,
          reputation: response.data.reputation,
          ip: response.data.ip,
          country: response.data.country,
          registrar: response.data.registrar,
          created: response.data.domain_age,
          detections: response.data.detections,
        };
      },
    },

    scanDomainStats: {
      isTool: true,
      input: z.object({}),
      handler: async (ctx) => {
        const apiKey = ctx.auth.method === 'headers' ? ctx.auth.headers['X-Api-Key'] : '';
        const response = await ctx.client.get(
          `https://api.urlvoid.com/api1000/${apiKey}/stats/remained`
        );
        return {
          queriesRemaining: response.data.queries_remaining,
          queriesUsed: response.data.queries_used,
          plan: response.data.plan,
        };
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        const apiKey = ctx.auth.method === 'headers' ? ctx.auth.headers['X-Api-Key'] : '';
        await ctx.client.get(`https://api.urlvoid.com/api1000/${apiKey}/stats/remained`);
        return {
          ok: true,
          message: 'Successfully connected to URLVoid API',
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect: ${error}`,
        };
      }
    },
    description: 'Verifies URLVoid API key',
  },
};
