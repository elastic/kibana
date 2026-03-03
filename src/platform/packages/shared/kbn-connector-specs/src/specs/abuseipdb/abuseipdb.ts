/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Example: AbuseIPDB Connector
 *
 * This demonstrates a threat intelligence connector with:
 * - IP reputation checking
 * - Abuse reporting
 * - Geolocation and ISP data
 * - Bulk IP checking
 *
 * MVP implementation focusing on core IP reputation actions.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';

export const AbuseIPDBConnector: ConnectorSpec = {
  metadata: {
    id: '.abuseipdb',
    displayName: 'AbuseIPDB',
    description: i18n.translate('connectorSpecs.abuseipdb.metadata.description', {
      defaultMessage: 'IP reputation checking and abuse reporting',
    }),
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [{ type: 'api_key_header', defaults: { headerField: 'Key' } }],
  },

  actions: {
    checkIp: {
      isTool: true,
      input: z.object({
        ipAddress: z.ipv4().describe('IP address to check'),
        maxAgeInDays: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .default(90)
          .describe('Maximum age of reports in days'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { ipAddress: string; maxAgeInDays?: number };
        const response = await ctx.client.get('https://api.abuseipdb.com/api/v2/check', {
          params: {
            ipAddress: typedInput.ipAddress,
            maxAgeInDays: typedInput.maxAgeInDays || 90,
          },
        });
        return {
          ipAddress: response.data.data.ipAddress,
          abuseConfidenceScore: response.data.data.abuseConfidenceScore,
          usageType: response.data.data.usageType,
          isp: response.data.data.isp,
          countryCode: response.data.data.countryCode,
          totalReports: response.data.data.totalReports,
        };
      },
    },

    reportIp: {
      isTool: true,
      input: z.object({
        ip: z.ipv4().describe('IP address to report'),
        categories: z.array(z.number().int()).min(1).describe('Abuse category IDs'),
        comment: z.string().optional().describe('Additional details'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { ip: string; categories: number[]; comment?: string };
        const response = await ctx.client.post(
          'https://api.abuseipdb.com/api/v2/report',
          new URLSearchParams({
            ip: typedInput.ip,
            categories: typedInput.categories.join(','),
            ...(typedInput.comment && { comment: typedInput.comment }),
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
        return {
          ipAddress: response.data.data.ipAddress,
          abuseConfidenceScore: response.data.data.abuseConfidenceScore,
        };
      },
    },

    getIpInfo: {
      isTool: true,
      input: z.object({
        ipAddress: z.ipv4().describe('IP address to lookup'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { ipAddress: string };
        const response = await ctx.client.get('https://api.abuseipdb.com/api/v2/check', {
          params: {
            ipAddress: typedInput.ipAddress,
            verbose: true,
          },
        });
        return {
          ipAddress: response.data.data.ipAddress,
          isPublic: response.data.data.isPublic,
          ipVersion: response.data.data.ipVersion,
          isWhitelisted: response.data.data.isWhitelisted,
          abuseConfidenceScore: response.data.data.abuseConfidenceScore,
          countryCode: response.data.data.countryCode,
          usageType: response.data.data.usageType,
          isp: response.data.data.isp,
          domain: response.data.data.domain,
        };
      },
    },

    bulkCheck: {
      isTool: true,
      input: z.object({
        network: z.string().describe('Network in CIDR notation'),
        maxAgeInDays: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .default(30)
          .describe('Maximum age of reports in days'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { network: string; maxAgeInDays?: number };
        const response = await ctx.client.get('https://api.abuseipdb.com/api/v2/check-block', {
          params: {
            network: typedInput.network,
            maxAgeInDays: typedInput.maxAgeInDays || 30,
          },
        });
        return {
          networkAddress: response.data.data.networkAddress,
          netmask: response.data.data.netmask,
          reportedAddress: response.data.data.reportedAddress,
        };
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        await ctx.client.get('https://api.abuseipdb.com/api/v2/check', {
          params: { ipAddress: '8.8.8.8' },
        });
        return {
          ok: true,
          message: 'Successfully connected to AbuseIPDB API',
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect: ${error}`,
        };
      }
    },
    description: i18n.translate('connectorSpecs.abuseipdb.test.description', {
      defaultMessage: 'Verifies AbuseIPDB API key',
    }),
  },
};
