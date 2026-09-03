/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * AbuseIPDB connector - IP reputation check, report, CIDR bulk-check, and blacklist feed.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';

const ABUSEIPDB_API = 'https://api.abuseipdb.com/api/v2';

/** AbuseIPDB accepts IPv4 and IPv6 on check/report endpoints. */
const IpAddressSchema = z.union([z.ipv4(), z.ipv6()]);

const MaxAgeInDaysSchema = z.coerce.number().int().min(1).max(365);

const MAX_BLACKLIST_LIMIT = 10_000;
const MAX_REPORT_CATEGORIES = 30;
const MAX_COMMENT_LENGTH = 1024;

export const AbuseIPDBConnector: ConnectorSpec = {
  metadata: {
    id: '.abuseipdb',
    displayName: 'AbuseIPDB',
    description: i18n.translate('connectorSpecs.abuseipdb.metadata.description', {
      defaultMessage: 'IP reputation checking and abuse reporting',
    }),
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [{ type: 'api_key_header', defaults: { headerField: 'Key' } }],
  },

  actions: {
    checkIp: {
      isTool: true,
      scope: 'read',
      description:
        'Check an IPv4 or IPv6 address against AbuseIPDB. Returns abuseConfidenceScore, totalReports, and lastReportedAt. Unknown or clean addresses return score 0 as data (do not treat as an error). Use getIpInfo when you need verbose geo/ISP/domain fields.',
      input: lazySchema(() =>
        z.object({
          ipAddress: IpAddressSchema.describe(
            'IPv4 or IPv6 address to check. Example: 8.8.8.8 or 2001:4860:4860::8888.'
          ),
          maxAgeInDays: MaxAgeInDaysSchema.optional()
            .default(90)
            .describe('Only consider reports from the last N days (1-365). Defaults to 90.'),
        })
      ),
      handler: async (ctx, input: { ipAddress: string; maxAgeInDays?: number }) => {
        const response = await ctx.client.get(`${ABUSEIPDB_API}/check`, {
          params: {
            ipAddress: input.ipAddress,
            maxAgeInDays: input.maxAgeInDays ?? 90,
          },
        });
        return {
          ipAddress: response.data.data.ipAddress,
          abuseConfidenceScore: response.data.data.abuseConfidenceScore,
          usageType: response.data.data.usageType,
          isp: response.data.data.isp,
          countryCode: response.data.data.countryCode,
          totalReports: response.data.data.totalReports,
          lastReportedAt: response.data.data.lastReportedAt ?? null,
        };
      },
    },

    reportIp: {
      isTool: true,
      scope: 'write',
      description:
        'Submit an abuse report for an IPv4 or IPv6 address. Requires one or more numeric category IDs (see AbuseIPDB category list). Returns the updated abuseConfidenceScore.',
      input: lazySchema(() =>
        z.object({
          ip: IpAddressSchema.describe('IPv4 or IPv6 address to report.'),
          categories: z
            .array(z.coerce.number().int().min(1).max(99))
            .min(1)
            .max(MAX_REPORT_CATEGORIES)
            .describe(
              'Abuse category IDs (integers). Example: [18, 22] for brute-force / SSH. At least one required.'
            ),
          comment: z
            .string()
            .min(1)
            .max(MAX_COMMENT_LENGTH)
            .optional()
            .describe('Optional comment describing the observed abuse (max 1024 characters).'),
        })
      ),
      handler: async (ctx, input: { ip: string; categories: number[]; comment?: string }) => {
        const response = await ctx.client.post(
          `${ABUSEIPDB_API}/report`,
          new URLSearchParams({
            ip: input.ip,
            categories: input.categories.join(','),
            ...(input.comment !== undefined ? { comment: input.comment } : {}),
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
      scope: 'read',
      description:
        'Verbose IP enrichment via /check?verbose=true. Prefer this over checkIp when workflows need isPublic, isWhitelisted, domain, or fuller geo/ISP context. Uses the same maxAgeInDays default (90) as checkIp so totalReports and lastReportedAt stay comparable.',
      input: lazySchema(() =>
        z.object({
          ipAddress: IpAddressSchema.describe('IPv4 or IPv6 address to look up.'),
          maxAgeInDays: MaxAgeInDaysSchema.optional()
            .default(90)
            .describe('Only consider reports from the last N days (1-365). Defaults to 90.'),
        })
      ),
      handler: async (ctx, input: { ipAddress: string; maxAgeInDays?: number }) => {
        const response = await ctx.client.get(`${ABUSEIPDB_API}/check`, {
          params: {
            ipAddress: input.ipAddress,
            maxAgeInDays: input.maxAgeInDays ?? 90,
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
          totalReports: response.data.data.totalReports,
          lastReportedAt: response.data.data.lastReportedAt ?? null,
        };
      },
    },

    bulkCheck: {
      isTool: true,
      scope: 'read',
      description:
        'Check a CIDR network block via /check-block. Returns network metadata and reported addresses within the block for subnet-level triage.',
      input: lazySchema(() =>
        z.object({
          network: z
            .string()
            .min(1)
            .max(64)
            .describe('Network in CIDR notation. Example: 198.51.100.0/24.'),
          maxAgeInDays: MaxAgeInDaysSchema.optional()
            .default(30)
            .describe('Only consider reports from the last N days (1-365). Defaults to 30.'),
        })
      ),
      handler: async (ctx, input: { network: string; maxAgeInDays?: number }) => {
        const response = await ctx.client.get(`${ABUSEIPDB_API}/check-block`, {
          params: {
            network: input.network,
            maxAgeInDays: input.maxAgeInDays ?? 30,
          },
        });
        return {
          networkAddress: response.data.data.networkAddress,
          netmask: response.data.data.netmask,
          reportedAddress: response.data.data.reportedAddress,
        };
      },
    },

    getBlacklist: {
      isTool: true,
      scope: 'read',
      description:
        'Fetch the AbuseIPDB blacklist feed of most-reported IPs at or above a confidence threshold. Use for blocklist generation and enrichment feeds. Prefer confidenceMinimum 75-100 for denial-of-service style blocking.',
      input: lazySchema(() =>
        z.object({
          confidenceMinimum: z.coerce
            .number()
            .int()
            .min(25)
            .max(100)
            .optional()
            .default(100)
            .describe(
              'Minimum abuse confidence score (25-100). Defaults to 100. AbuseIPDB recommends 75-100 for most deny-list uses.'
            ),
          limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(MAX_BLACKLIST_LIMIT)
            .optional()
            .default(10)
            .describe(
              `Maximum number of IPs to return (1-${MAX_BLACKLIST_LIMIT}). Defaults to 10 to keep workflow step outputs small; raise explicitly when you need a larger feed. AbuseIPDB may truncate further based on subscription tier.`
            ),
        })
      ),
      handler: async (ctx, input: { confidenceMinimum?: number; limit?: number }) => {
        const response = await ctx.client.get(`${ABUSEIPDB_API}/blacklist`, {
          params: {
            confidenceMinimum: input.confidenceMinimum ?? 100,
            limit: input.limit ?? 10,
          },
        });
        return {
          generatedAt: response.data.meta?.generatedAt ?? null,
          ips: response.data.data ?? [],
        };
      },
    },
  },

  test: {
    handler: async (ctx) => {
      await ctx.client.get(`${ABUSEIPDB_API}/check`, {
        params: { ipAddress: '8.8.8.8' },
      });
      return {};
    },
    description: i18n.translate('connectorSpecs.abuseipdb.test.description', {
      defaultMessage: 'Verifies AbuseIPDB API key',
    }),
    enabled: true,
  },
};
