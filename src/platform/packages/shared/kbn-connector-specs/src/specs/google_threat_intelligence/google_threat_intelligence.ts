/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas } from '../../connector_spec';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  AdvancedSearchInputSchema,
  GetCollectionInputSchema,
  GetFileMitreAttackTechniquesInputSchema,
  GetIocStreamInputSchema,
  GetRelatedObjectsInputSchema,
  GetReportMitreAttackTechniquesInputSchema,
  SearchCollectionIocsInputSchema,
  SearchCollectionsInputSchema,
} from './types';
import type {
  AdvancedSearchInput,
  GetCollectionInput,
  GetFileMitreAttackTechniquesInput,
  GetIocStreamInput,
  GetRelatedObjectsInput,
  GetReportMitreAttackTechniquesInput,
  SearchCollectionIocsInput,
  SearchCollectionsInput,
} from './types';

const GTI_DEFAULT_BASE_URL = 'https://www.virustotal.com';
const GTI_HEADERS = { 'x-tool': 'Elastic' };

interface GtiErrorResponse {
  response?: {
    status?: number;
    data?: {
      error?: {
        code?: string;
        message?: string;
      };
    };
  };
}

interface GtiIpReport {
  data?: {
    attributes?: {
      gti_assessment?: object;
    };
  };
}

type GtiQueryParams = Record<string, string | number | boolean | undefined>;

const buildBaseUrl = (ctx: ActionContext): string => {
  const configuredBaseUrl = (ctx.config?.baseUrl as string | undefined)?.trim();
  return (configuredBaseUrl || GTI_DEFAULT_BASE_URL).replace(/\/+$/, '');
};

function throwGtiError(error: unknown): never {
  const response =
    error && typeof error === 'object' && 'response' in error
      ? (error as GtiErrorResponse).response
      : undefined;
  const { code, message } = response?.data?.error ?? {};
  const detail = message ?? code;
  if (detail) {
    throw new Error(`GTI API error (${response?.status ?? 'unknown'}): ${detail}`);
  }
  throw error;
}

const getGti = async <T = object>(
  ctx: ActionContext,
  path: string,
  params?: GtiQueryParams
): Promise<T> => {
  try {
    const response = await ctx.client.get<T>(`${buildBaseUrl(ctx)}/api/v3${path}`, {
      headers: GTI_HEADERS,
      params,
    });
    return response.data;
  } catch (error: unknown) {
    throwGtiError(error);
  }
};

const buildReportMitreFilter = (input: GetReportMitreAttackTechniquesInput): string | undefined => {
  const filters = [
    input.mitreNamespace ? `mitre_namespace:${input.mitreNamespace}` : undefined,
    input.ttpSource ? `ttp_source:${input.ttpSource}` : undefined,
  ].filter((filter): filter is string => filter !== undefined);
  return filters.length > 0 ? filters.join(' ') : undefined;
};

export const GoogleThreatIntelligenceConnector: ConnectorSpec = {
  metadata: {
    id: '.google_threat_intelligence',
    displayName: 'Google Threat Intelligence',
    description: i18n.translate('connectorSpecs.googleThreatIntelligence.metadata.description', {
      defaultMessage:
        'Search threat collections, related objects, IOC streams, and file ATT&CK intelligence',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder', 'workflows'],
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        defaults: { headerField: 'x-apikey' },
        overrides: {
          meta: {
            'x-apikey': {
              placeholder: 'gti-...',
              helpText: i18n.translate(
                'connectorSpecs.googleThreatIntelligence.auth.apiKey.helpText',
                {
                  defaultMessage:
                    'The key must belong to an account with the GTI Enterprise subscription tier; ' +
                    'a key without that entitlement fails the Test connector check.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      baseUrl: UISchemas.url(GTI_DEFAULT_BASE_URL)
        .max(2048)
        .optional()
        .describe('Google Threat Intelligence API origin')
        .meta({
          label: i18n.translate('connectorSpecs.googleThreatIntelligence.config.baseUrl.label', {
            defaultMessage: 'API base URL',
          }),
          helpText: i18n.translate(
            'connectorSpecs.googleThreatIntelligence.config.baseUrl.helpText',
            {
              defaultMessage:
                'Leave empty to use https://www.virustotal.com. Change this only when you use a compatible GTI API proxy.',
            }
          ),
          validate: { allowedHosts: true },
        }),
    })
  ),

  validateUrls: {
    fields: ['baseUrl'],
  },

  actions: {
    searchCollections: {
      isTool: true,
      description:
        'Search and filter GTI threat objects, including actors, campaigns, malware families, toolkits, vulnerabilities, reports, IOC collections, and profiles. Returns object IDs for use with getCollection and relationship actions.',
      input: SearchCollectionsInputSchema,
      handler: async (ctx, input: SearchCollectionsInput) =>
        getGti(ctx, '/collections', {
          filter: input.filter,
          order: input.order,
          limit: input.limit,
          cursor: input.cursor,
        }),
    },

    getCollection: {
      isTool: true,
      description:
        'Get the full GTI threat object for an ID returned by searchCollections. Supports threat actors, campaigns, malware families, toolkits, vulnerabilities, reports, IOC collections, and country or industry profiles.',
      input: GetCollectionInputSchema,
      handler: async (ctx, input: GetCollectionInput) =>
        getGti(ctx, `/collections/${encodeURIComponent(input.id)}`),
    },

    getRelatedObjects: {
      isTool: true,
      description:
        'Get objects in a named relationship of a GTI collection, such as files or associations. Use relationship names provided by the collection object and page through results with the returned cursor.',
      input: GetRelatedObjectsInputSchema,
      handler: async (ctx, input: GetRelatedObjectsInput) =>
        getGti(
          ctx,
          `/collections/${encodeURIComponent(input.id)}/${encodeURIComponent(input.relationship)}`,
          { limit: input.limit, cursor: input.cursor }
        ),
    },

    searchCollectionIocs: {
      isTool: true,
      description:
        'Search IOCs associated with a threat actor, campaign, malware family, toolkit, report, vulnerability, or IOC collection using a GTI intelligence query. Returns files by default; add an entity modifier to search domains, IP addresses, or URLs.',
      input: SearchCollectionIocsInputSchema,
      handler: async (ctx, input: SearchCollectionIocsInput) =>
        getGti(ctx, `/collections/${encodeURIComponent(input.id)}/search`, {
          query: input.query,
          order: input.order,
          limit: input.limit,
          cursor: input.cursor,
          attributes: input.attributes,
          relationships: input.relationships,
        }),
    },

    getIocStream: {
      isTool: true,
      description:
        'Get recent files, URLs, domains, and IP addresses from the GTI IOC stream. Filter by date, origin, entity, source, or notification tag; notifications are retained for 30 days.',
      input: GetIocStreamInputSchema,
      handler: async (ctx, input: GetIocStreamInput) =>
        getGti(ctx, '/ioc_stream', {
          filter: input.filter,
          order: input.order,
          limit: input.limit,
          cursor: input.cursor,
          descriptors_only: input.descriptorsOnly,
        }),
    },

    advancedSearch: {
      isTool: true,
      description:
        'Search the GTI corpus for files, URLs, domains, or IP addresses with an intelligence query. Returns full objects by default or compact descriptors when requested.',
      input: AdvancedSearchInputSchema,
      handler: async (ctx, input: AdvancedSearchInput) =>
        getGti(ctx, '/intelligence/search', {
          query: input.query,
          order: input.order,
          limit: input.limit,
          cursor: input.cursor,
          descriptors_only: input.descriptorsOnly,
        }),
    },

    getReportMitreAttackTechniques: {
      isTool: true,
      description:
        'Get MITRE ATT&CK tactics and techniques associated with a GTI report. Filter by ATT&CK matrix and whether each technique was linked by analysts or observed in related IOCs.',
      input: GetReportMitreAttackTechniquesInputSchema,
      handler: async (ctx, input: GetReportMitreAttackTechniquesInput) =>
        getGti(ctx, `/collections/${encodeURIComponent(input.reportId)}/mitre_tree`, {
          filter: buildReportMitreFilter(input),
        }),
    },

    getFileMitreAttackTechniques: {
      isTool: true,
      description:
        'Get the MITRE ATT&CK tactics and techniques observed for a file by hash (SHA-256, SHA-1, or ' +
        'MD5), grouped by the sandbox that observed them. Each technique lists the signatures that ' +
        'triggered it and their severity. Throws when GTI has no record of the hash at all.',
      input: GetFileMitreAttackTechniquesInputSchema,
      handler: async (ctx, input: GetFileMitreAttackTechniquesInput) =>
        getGti(ctx, `/files/${encodeURIComponent(input.fileHash)}/behaviour_mitre_trees`),
    },
  },

  skill: [
    '## Google Threat Intelligence connector',
    '',
    '## Threat landscape',
    '- Call `searchCollections` first, then use its object ID with `getCollection`, `getRelatedObjects`, ' +
      '`searchCollectionIocs`, or `getReportMitreAttackTechniques`.',
    '- Collection types share one API. Do not infer an object type from its display name; use its returned `type` and ID.',
    '- `searchCollectionIocs` searches files by default. Add `entity:domain`, `entity:ip`, or `entity:url` to its query for another IOC type.',
    '',
    '## Search and paging',
    '- Pass the returned cursor unchanged to fetch the next page. GTI list and search actions return up to 40 items per page.',
    '- Fuzzy-hash corpus searches are typically limited to 15 requests per minute.',
    '',
    '## IOC stream',
    '- IOC stream notifications expire after 30 days. Use date filters and persist the returned cursor for incremental collection.',
    '',
    '## File ATT&CK intelligence',
    '- `getFileMitreAttackTechniques` groups tactics, techniques, and signatures by sandbox name. The same file can show a different ATT&CK tree for each sandbox.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('connectorSpecs.googleThreatIntelligence.test.description', {
      defaultMessage:
        'Verifies the API key and confirms your Google Threat Intelligence subscription tier',
    }),
    handler: async (ctx) => {
      const response = await getGti<GtiIpReport>(ctx, '/ip_addresses/8.8.8.8');
      const hasGtiAssessment = Boolean(response.data?.attributes?.gti_assessment);
      if (!hasGtiAssessment) {
        throw new Error(
          'This API key does not have an Enterprise subscription. Use a key from an account ' +
            'with the GTI Enterprise subscription tier.'
        );
      }
      return {};
    },
  },
};
