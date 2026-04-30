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
 * - URL and domain analysis
 * - Analysis result retrieval
 * - File submission for analysis
 * - IP address reputation lookups
 *
 * MVP implementation focusing on core threat intelligence actions.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

const VIRUSTOTAL_API_BASE_URL = 'https://www.virustotal.com/api/v3';
const VIRUSTOTAL_RESOURCE_TYPES = ['analysis', 'url', 'domain', 'ip', 'file'] as const;
const VIRUSTOTAL_DOMAIN_REGEX = z.regexes.domain;
const VIRUSTOTAL_DOMAIN_SCHEMA = z.string().regex(VIRUSTOTAL_DOMAIN_REGEX);
const VIRUSTOTAL_URL_SCHEMA = z.url({
  protocol: /^https?$/,
  hostname: VIRUSTOTAL_DOMAIN_REGEX,
});

type VirusTotalResourceType = (typeof VIRUSTOTAL_RESOURCE_TYPES)[number];

/**
 * Common error handling for VirusTotal API responses
 */
interface AxiosError {
  response?: {
    status?: number;
    data?: {
      error?: unknown;
    };
  };
}

interface ErrorHandlerOptions {
  failOnError?: boolean;
  notFoundMessage: string;
  genericMessage: string;
}

interface ErrorResult {
  id: null;
  error: {
    status: number | undefined;
    message: string;
    details: unknown;
  };
}

const isVirusTotalUrl = (value: string): boolean => VIRUSTOTAL_URL_SCHEMA.safeParse(value).success;

const normalizeDomain = (value: string): string => value.trim().toLowerCase();

const isValidDomain = (value: string): boolean =>
  VIRUSTOTAL_DOMAIN_SCHEMA.safeParse(normalizeDomain(value)).success;

const urlOrDomainSchema = z.xor([VIRUSTOTAL_URL_SCHEMA, VIRUSTOTAL_DOMAIN_SCHEMA]);

const getVirusTotalUrlIdentifier = (urlOrId: string): string => {
  const value = urlOrId.trim();

  if (!isVirusTotalUrl(value)) {
    return encodeURIComponent(value);
  }

  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const getVirusTotalResourcePath = (resourceType: VirusTotalResourceType, id: string): string => {
  const value = id.trim();

  switch (resourceType) {
    case 'analysis':
      return `analyses/${encodeURIComponent(value)}`;
    case 'url':
      return `urls/${getVirusTotalUrlIdentifier(value)}`;
    case 'domain':
      return `domains/${encodeURIComponent(normalizeDomain(value))}`;
    case 'ip':
      return `ip_addresses/${encodeURIComponent(value)}`;
    case 'file':
      return `files/${encodeURIComponent(value)}`;
  }
};

function handleVirusTotalError(error: unknown, options: ErrorHandlerOptions): ErrorResult | never {
  // Only handle axios errors with response
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object'
  ) {
    const axiosError = error as AxiosError;
    const response = axiosError.response;
    if (!response) {
      throw error;
    }
    const status = response.status;
    const isNotFound = status === 404;

    // If failOnError is true, throw descriptive error
    if (options.failOnError) {
      const errorMessage = isNotFound
        ? `${options.notFoundMessage} (HTTP ${status})`
        : `${options.genericMessage} (HTTP ${status})`;
      throw new Error(errorMessage);
    }

    // Return error information instead of throwing
    return {
      id: null,
      error: {
        status,
        message: isNotFound ? options.notFoundMessage : options.genericMessage,
        details: response.data?.error,
      },
    };
  }

  // For non-axios errors, always throw
  throw error;
}

export const VirusTotalConnector: ConnectorSpec = {
  metadata: {
    id: '.virustotal',
    displayName: 'VirusTotal',
    description: i18n.translate('connectorSpecs.virustotal.metadata.description', {
      defaultMessage: 'File scanning, URL and domain analysis, and threat intelligence lookups',
    }),
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        defaults: { headerField: 'x-apikey' },
        overrides: { meta: { 'x-apikey': { placeholder: 'vt-...' } } },
      },
    ],
  },

  actions: {
    scanFileHash: {
      isTool: true,
      input: z.object({
        hash: z.string().min(32).describe('File hash (MD5, SHA-1, or SHA-256)'),
        failOnError: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            'If true, throw error on API failures. If false (default), return error details'
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { hash: string; failOnError?: boolean };
        try {
          const response = await ctx.client.get(
            `${VIRUSTOTAL_API_BASE_URL}/files/${encodeURIComponent(typedInput.hash)}`
          );
          return {
            id: response.data.data.id,
            attributes: response.data.data.attributes,
            stats: response.data.data.attributes.last_analysis_stats,
          };
        } catch (error: unknown) {
          return handleVirusTotalError(error, {
            failOnError: typedInput.failOnError,
            notFoundMessage: 'Hash not found in VirusTotal database',
            genericMessage: 'VirusTotal API request failed',
          });
        }
      },
    },

    scanUrl: {
      isTool: true,
      input: z.object({
        url: urlOrDomainSchema.describe('Absolute URL to scan, or bare domain to look up'),
        failOnError: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            'If true, throw error on API failures. If false (default), return error details'
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { url: string; failOnError?: boolean };
        try {
          const url = typedInput.url.trim();

          if (isValidDomain(url)) {
            const response = await ctx.client.get(
              `${VIRUSTOTAL_API_BASE_URL}/domains/${encodeURIComponent(normalizeDomain(url))}`
            );
            return {
              id: response.data.data.id,
              type: response.data.data.type,
              attributes: response.data.data.attributes,
              stats: response.data.data.attributes.last_analysis_stats,
              reputation: response.data.data.attributes.reputation,
            };
          }

          const submitResponse = await ctx.client.post(
            `${VIRUSTOTAL_API_BASE_URL}/urls`,
            new URLSearchParams({ url }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );
          const analysisId = submitResponse.data.data.id;
          const analysisResponse = await ctx.client.get(
            `${VIRUSTOTAL_API_BASE_URL}/analyses/${encodeURIComponent(analysisId)}`
          );
          return {
            id: analysisId,
            status: analysisResponse.data.data.attributes.status,
            stats: analysisResponse.data.data.attributes.stats,
          };
        } catch (error: unknown) {
          return handleVirusTotalError(error, {
            failOnError: typedInput.failOnError,
            notFoundMessage: 'URL not found in VirusTotal database',
            genericMessage: 'VirusTotal API request failed',
          });
        }
      },
    },

    getAnalysisResults: {
      isTool: true,
      input: z.object({
        id: z
          .string()
          .trim()
          .min(1)
          .describe('VirusTotal analysis ID, URL, domain, IP address, or file hash'),
        resourceType: z
          .enum(VIRUSTOTAL_RESOURCE_TYPES)
          .optional()
          .default('analysis')
          .describe('Type of VirusTotal resource to retrieve'),
        failOnError: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            'If true, throw error on API failures. If false (default), return error details'
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          id: string;
          resourceType?: VirusTotalResourceType;
          failOnError?: boolean;
        };
        const resourceType = typedInput.resourceType ?? 'analysis';

        try {
          const response = await ctx.client.get(
            `${VIRUSTOTAL_API_BASE_URL}/${getVirusTotalResourcePath(resourceType, typedInput.id)}`
          );
          const attributes = response.data.data.attributes;
          return {
            id: response.data.data.id,
            type: response.data.data.type,
            attributes,
            status: attributes.status,
            stats: attributes.stats ?? attributes.last_analysis_stats,
            links: response.data.data.links,
          };
        } catch (error: unknown) {
          return handleVirusTotalError(error, {
            failOnError: typedInput.failOnError,
            notFoundMessage: 'VirusTotal analysis results not found',
            genericMessage: 'VirusTotal analysis results request failed',
          });
        }
      },
    },

    submitFile: {
      isTool: true,
      input: z.object({
        file: z.string().describe('Base64-encoded file content'),
        filename: z.string().optional().describe('Original filename'),
        failOnError: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            'If true, throw error on API failures. If false (default), return error details'
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { file: string; filename?: string; failOnError?: boolean };
        try {
          const buffer = Buffer.from(typedInput.file, 'base64');
          const formData = new FormData();
          formData.append('file', new Blob([buffer]), typedInput.filename || 'file');

          const response = await ctx.client.post(`${VIRUSTOTAL_API_BASE_URL}/files`, formData);
          return {
            id: response.data.data.id,
            type: response.data.data.type,
            links: response.data.data.links,
          };
        } catch (error: unknown) {
          return handleVirusTotalError(error, {
            failOnError: typedInput.failOnError,
            notFoundMessage: 'File submission failed',
            genericMessage: 'VirusTotal file submission failed',
          });
        }
      },
    },

    getIpReport: {
      isTool: true,
      input: z.object({
        ip: z.ipv4().describe('IP address'),
        failOnError: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            'If true, throw error on API failures. If false (default), return error details'
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { ip: string; failOnError?: boolean };
        try {
          const response = await ctx.client.get(
            `${VIRUSTOTAL_API_BASE_URL}/ip_addresses/${encodeURIComponent(typedInput.ip)}`
          );
          return {
            id: response.data.data.id,
            attributes: response.data.data.attributes,
            reputation: response.data.data.attributes.reputation,
            country: response.data.data.attributes.country,
          };
        } catch (error: unknown) {
          return handleVirusTotalError(error, {
            failOnError: typedInput.failOnError,
            notFoundMessage: 'IP address not found in VirusTotal database',
            genericMessage: 'VirusTotal API request failed',
          });
        }
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        await ctx.client.get(`${VIRUSTOTAL_API_BASE_URL}/ip_addresses/8.8.8.8`);
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
    description: i18n.translate('connectorSpecs.virustotal.test.description', {
      defaultMessage: 'Verifies VirusTotal API key',
    }),
  },
};
