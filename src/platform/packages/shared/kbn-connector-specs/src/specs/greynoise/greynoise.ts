/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Example: GreyNoise Connector
 *
 * This demonstrates a threat intelligence connector with:
 * - IP context and classification
 * - Quick noise status lookup
 * - Metadata retrieval
 * - RIOT (Rule It Out) benign service detection
 *
 * MVP implementation focusing on core noise detection actions.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';

export const GreyNoiseConnector: ConnectorSpec = {
  metadata: {
    id: '.greynoise',
    displayName: 'GreyNoise',
    description: i18n.translate('connectorSpecs.greynoise.metadata.description', {
      defaultMessage: 'Internet scanning noise detection and classification',
    }),
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [{ type: 'api_key_header', defaults: { headerField: 'key' } }],
  },

  actions: {
    getIpContext: {
      isTool: true,
      input: z.object({
        ip: z.ipv4().describe('IP address'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { ip: string };
        const response = await ctx.client.get(
          `https://api.greynoise.io/v2/noise/context/${typedInput.ip}`
        );
        return {
          ip: response.data.ip,
          seen: response.data.seen,
          classification: response.data.classification,
          firstSeen: response.data.first_seen,
          lastSeen: response.data.last_seen,
          actor: response.data.actor,
          tags: response.data.tags,
        };
      },
    },

    quickLookup: {
      isTool: true,
      input: z.object({
        ip: z.ipv4().describe('IP address'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { ip: string };
        const response = await ctx.client.get(
          `https://api.greynoise.io/v2/noise/quick/${typedInput.ip}`
        );
        return {
          ip: typedInput.ip,
          noise: response.data.noise,
          code: response.data.code,
          codeMessage: response.data.code_message,
        };
      },
    },

    getMetadata: {
      isTool: true,
      input: z.object({
        ip: z.ipv4().describe('IP address'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { ip: string };
        const response = await ctx.client.get('https://api.greynoise.io/v2/meta/metadata', {
          params: { ip: typedInput.ip },
        });
        return {
          ip: typedInput.ip,
          metadata: response.data.metadata,
          asn: response.data.asn,
          city: response.data.city,
          country: response.data.country,
          countryCode: response.data.country_code,
          organization: response.data.organization,
        };
      },
    },

    riotLookup: {
      isTool: true,
      input: z.object({
        ip: z.ipv4().describe('IP address'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { ip: string };
        const response = await ctx.client.get(`https://api.greynoise.io/v2/riot/${typedInput.ip}`);
        return {
          ip: typedInput.ip,
          riot: response.data.riot,
          category: response.data.category,
          name: response.data.name,
          description: response.data.description,
          explanation: response.data.explanation,
          lastUpdated: response.data.last_updated,
        };
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        await ctx.client.get('https://api.greynoise.io/v2/noise/quick/8.8.8.8');
        return {
          ok: true,
          message: 'Successfully connected to GreyNoise API',
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect: ${error}`,
        };
      }
    },
    description: i18n.translate('connectorSpecs.greynoise.test.description', {
      defaultMessage: 'Verifies GreyNoise API key',
    }),
  },
};
