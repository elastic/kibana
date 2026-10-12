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

import { z, lazySchema } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';

import type { ConnectorSpec } from '../../connector_spec';

// DNS limits fully qualified domain names to 253 characters.
const DOMAIN_MAX_LENGTH = 253;
const URL_MAX_LENGTH = 2048;

export const URLVoidConnector: ConnectorSpec = {
  metadata: {
    id: '.urlvoid',
    displayName: 'URLVoid',
    description: i18n.translate('connectorSpecs.urlvoid.metadata.description', {
      defaultMessage: 'Domain and URL reputation checking via multi-engine scanning',
    }),
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [{ type: 'api_key_header', defaults: { headerField: 'X-Api-Key' } }],
  },

  actions: {
    scanDomain: {
      isTool: true,
      scope: 'read',
      description:
        'Scan a domain against URLVoid blocklist engines and return its reputation, detection count, and the engines that flagged it. Use this for a quick verdict on a bare domain; use getDomainInfo when you also need IP, country, registrar, and domain age.',
      input: lazySchema(() =>
        z.object({
          domain: z.string().max(DOMAIN_MAX_LENGTH).describe('Domain name to scan'),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as { domain: string };
        const apiKey = ctx.secrets?.authType === 'api_key_header' ? ctx.secrets['X-Api-Key'] : '';
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
      scope: 'read',
      description:
        'Check the reputation of a full URL by extracting its hostname and scanning it with URLVoid. Returns the URL, extracted domain, reputation, detection count, and flagging engines. Use this when you have a URL rather than a bare domain.',
      input: lazySchema(() =>
        z.object({
          url: z.url().max(URL_MAX_LENGTH).describe('URL to check'),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as { url: string };
        const domain = new URL(typedInput.url).hostname;
        const apiKey = ctx.secrets?.authType === 'api_key_header' ? ctx.secrets['X-Api-Key'] : '';
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
      scope: 'read',
      description:
        'Get reputation and registration details for a domain from URLVoid, including resolved IP, country, registrar, domain age, and detection count. Use this when investigating who owns or hosts a domain; use scanDomain for just the per-engine verdict.',
      input: lazySchema(() =>
        z.object({
          domain: z.string().max(DOMAIN_MAX_LENGTH).describe('Domain name'),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as { domain: string };
        const apiKey = ctx.secrets?.authType === 'api_key_header' ? ctx.secrets['X-Api-Key'] : '';
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
      scope: 'read',
      description:
        'Get URLVoid API usage for the configured key: queries remaining, queries used, and plan. Use this to check quota before running many scans; it does not scan any domain.',
      input: lazySchema(() => z.object({})),
      handler: async (ctx) => {
        const apiKey = ctx.secrets?.authType === 'api_key_header' ? ctx.secrets['X-Api-Key'] : '';
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
      const apiKey = ctx.secrets?.authType === 'api_key_header' ? ctx.secrets['X-Api-Key'] : '';
      await ctx.client.get(`https://api.urlvoid.com/api1000/${apiKey}/stats/remained`);
      return {};
    },
    description: i18n.translate('connectorSpecs.urlvoid.test.description', {
      defaultMessage: 'Verifies URLVoid API key',
    }),
    enabled: true,
  },
};
