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
  GetAnalysisInputSchema,
  GetCollectionInputSchema,
  GetDomainRelationshipInputSchema,
  GetDomainReportInputSchema,
  GetFileBehavioursInputSchema,
  GetFileMitreAttackTechniquesInputSchema,
  GetFileRelationshipInputSchema,
  GetFileReportInputSchema,
  GetIocStreamInputSchema,
  GetIpRelationshipInputSchema,
  GetIpReportInputSchema,
  GetPrivateAnalysisInputSchema,
  GetPrivateUrlReportInputSchema,
  GetRelatedObjectsInputSchema,
  GetReportMitreAttackTechniquesInputSchema,
  GetUrlRelationshipInputSchema,
  GetUrlReportInputSchema,
  GetUrlScanReportInputSchema,
  ScanPrivateUrlInputSchema,
  ScanUrlInputSchema,
  SearchCollectionIocsInputSchema,
  SearchCollectionsInputSchema,
} from './types';
import type {
  AdvancedSearchInput,
  GetAnalysisInput,
  GetCollectionInput,
  GetDomainRelationshipInput,
  GetDomainReportInput,
  GetFileBehavioursInput,
  GetFileMitreAttackTechniquesInput,
  GetFileRelationshipInput,
  GetFileReportInput,
  GetIocStreamInput,
  GetIpRelationshipInput,
  GetIpReportInput,
  GetPrivateAnalysisInput,
  GetPrivateUrlReportInput,
  GetRelatedObjectsInput,
  GetReportMitreAttackTechniquesInput,
  GetUrlRelationshipInput,
  GetUrlReportInput,
  GetUrlScanReportInput,
  ScanPrivateUrlInput,
  ScanUrlInput,
  SearchCollectionIocsInput,
  SearchCollectionsInput,
} from './types';

const GTI_DEFAULT_BASE_URL = 'https://www.virustotal.com';
const GTI_HEADERS = { 'x-tool': 'Elastic' };
const GTI_FORM_HEADERS = { ...GTI_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' };

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

const postGtiForm = async <T = object>(
  ctx: ActionContext,
  path: string,
  body: Record<string, string>
): Promise<T> => {
  try {
    const response = await ctx.client.post<T>(
      `${buildBaseUrl(ctx)}/api/v3${path}`,
      new URLSearchParams(body),
      { headers: GTI_FORM_HEADERS }
    );
    return response.data;
  } catch (error: unknown) {
    throwGtiError(error);
  }
};

/** GTI identifies a URL object by the base64url encoding of the URL exactly as supplied. */
const toGtiUrlId = (url: string): string => Buffer.from(url, 'utf-8').toString('base64url');

const buildReportMitreFilter = (input: GetReportMitreAttackTechniquesInput): string | undefined => {
  const filters = [
    input.mitreNamespace ? `mitre_namespace:${input.mitreNamespace}` : undefined,
    input.ttpSource ? `ttp_source:${input.ttpSource}` : undefined,
  ].filter((filter): filter is string => filter !== undefined);
  return filters.length > 0 ? filters.join(' ') : undefined;
};

const buildPrivateScanBody = (input: ScanPrivateUrlInput): Record<string, string> =>
  Object.fromEntries(
    Object.entries({
      url: input.url,
      user_agent: input.userAgent,
      sandboxes: input.sandboxes,
      retention_period_days: input.retentionPeriodDays,
      storage_region: input.storageRegion,
      interaction_sandbox: input.interactionSandbox,
      interaction_timeout: input.interactionTimeout,
    })
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );

export const GoogleThreatIntelligenceConnector: ConnectorSpec = {
  metadata: {
    id: '.google_threat_intelligence',
    displayName: 'Google Threat Intelligence',
    description: i18n.translate('connectorSpecs.googleThreatIntelligence.metadata.description', {
      defaultMessage:
        'Search GTI threat collections and IOC streams, enrich IP, domain, URL, and file indicators, and scan URLs',
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
      scope: 'read',
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
      scope: 'read',
      description:
        'Get the full GTI threat object for an ID returned by searchCollections. Supports threat actors, campaigns, malware families, toolkits, vulnerabilities, reports, IOC collections, and country or industry profiles.',
      input: GetCollectionInputSchema,
      handler: async (ctx, input: GetCollectionInput) =>
        getGti(ctx, `/collections/${encodeURIComponent(input.id)}`),
    },

    getRelatedObjects: {
      isTool: true,
      scope: 'read',
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
      scope: 'read',
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
      scope: 'read',
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
      scope: 'read',
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
      scope: 'read',
      description:
        'Get MITRE ATT&CK tactics and techniques associated with a GTI report. Filter by ATT&CK matrix and whether each technique was linked by analysts or observed in related IOCs.',
      input: GetReportMitreAttackTechniquesInputSchema,
      handler: async (ctx, input: GetReportMitreAttackTechniquesInput) =>
        getGti(ctx, `/collections/${encodeURIComponent(input.reportId)}/mitre_tree`, {
          filter: buildReportMitreFilter(input),
        }),
    },

    getIpReport: {
      isTool: true,
      scope: 'read',
      description:
        'Get the GTI reputation and detection report for an IPv4 or IPv6 address. Returns the GTI assessment, last analysis statistics, network ownership and geolocation where available, WHOIS data, and any tags GTI has applied.',
      input: GetIpReportInputSchema,
      handler: async (ctx, input: GetIpReportInput) =>
        getGti(ctx, `/ip_addresses/${encodeURIComponent(input.ipAddress)}`),
    },

    getIpRelationship: {
      isTool: true,
      scope: 'read',
      description:
        'Get objects related to an IPv4 or IPv6 address, such as communicating files, hosted URLs, or historical DNS resolutions. Use a relationship name published for IP address objects and page through results with the returned cursor.',
      input: GetIpRelationshipInputSchema,
      handler: async (ctx, input: GetIpRelationshipInput) =>
        getGti(
          ctx,
          `/ip_addresses/${encodeURIComponent(input.ipAddress)}/${encodeURIComponent(
            input.relationship
          )}`,
          { limit: input.limit, cursor: input.cursor }
        ),
    },

    getDomainReport: {
      isTool: true,
      scope: 'read',
      description:
        'Get the GTI reputation and detection report for a domain name. Returns the GTI assessment, last analysis statistics, categorization, WHOIS data, and any tags GTI has applied.',
      input: GetDomainReportInputSchema,
      handler: async (ctx, input: GetDomainReportInput) =>
        getGti(ctx, `/domains/${encodeURIComponent(input.domain)}`),
    },

    getDomainRelationship: {
      isTool: true,
      scope: 'read',
      description:
        'Get objects related to a domain name, such as DNS resolutions, subdomains, or communicating files. Use a relationship name published for domain objects and page through results with the returned cursor.',
      input: GetDomainRelationshipInputSchema,
      handler: async (ctx, input: GetDomainRelationshipInput) =>
        getGti(
          ctx,
          `/domains/${encodeURIComponent(input.domain)}/${encodeURIComponent(input.relationship)}`,
          { limit: input.limit, cursor: input.cursor }
        ),
    },

    getUrlReport: {
      isTool: true,
      scope: 'read',
      description:
        'Get the GTI reputation and detection report for a URL, including the GTI assessment, last analysis statistics, categorization, and the final resolved destination after any redirects. Supply the URL in its natural form; the action derives the identifier GTI uses internally.',
      input: GetUrlReportInputSchema,
      handler: async (ctx, input: GetUrlReportInput) =>
        getGti(ctx, `/urls/${toGtiUrlId(input.url)}`),
    },

    getUrlRelationship: {
      isTool: true,
      scope: 'read',
      description:
        'Get objects related to a URL, such as downloaded files, contacted domains and IP addresses, or redirect targets. Use a relationship name published for URL objects and supply the URL in its natural form, the same as for getUrlReport.',
      input: GetUrlRelationshipInputSchema,
      handler: async (ctx, input: GetUrlRelationshipInput) =>
        getGti(ctx, `/urls/${toGtiUrlId(input.url)}/${encodeURIComponent(input.relationship)}`, {
          limit: input.limit,
          cursor: input.cursor,
        }),
    },

    getFileReport: {
      isTool: true,
      scope: 'read',
      description:
        'Get the GTI reputation and detection report for a file by SHA-256, SHA-1, or MD5 hash. Returns the GTI assessment, last analysis statistics, file type metadata, and popular threat classification, not the sandbox detonation reports getFileBehaviours returns.',
      input: GetFileReportInputSchema,
      handler: async (ctx, input: GetFileReportInput) =>
        getGti(ctx, `/files/${encodeURIComponent(input.fileHash)}`),
    },

    getFileRelationship: {
      isTool: true,
      scope: 'read',
      description:
        'Get objects related to a file by SHA-256, SHA-1, or MD5 hash, such as domains and IP addresses contacted during detonation, dropped files, or similar files. Use a relationship name published for file objects and page through results with the returned cursor.',
      input: GetFileRelationshipInputSchema,
      handler: async (ctx, input: GetFileRelationshipInput) =>
        getGti(
          ctx,
          `/files/${encodeURIComponent(input.fileHash)}/${encodeURIComponent(input.relationship)}`,
          { limit: input.limit, cursor: input.cursor }
        ),
    },

    getFileBehaviours: {
      isTool: true,
      scope: 'read',
      description:
        'Get sandbox detonation reports for a file by SHA-256, SHA-1, or MD5 hash. Each report covers one sandbox run: the process tree, files, registry keys, and network activity it touched, plus the verdict.',
      input: GetFileBehavioursInputSchema,
      handler: async (ctx, input: GetFileBehavioursInput) =>
        getGti(ctx, `/files/${encodeURIComponent(input.fileHash)}/behaviours`, {
          limit: input.limit,
          cursor: input.cursor,
        }),
    },

    getFileMitreAttackTechniques: {
      isTool: true,
      scope: 'read',
      description:
        'Get the MITRE ATT&CK tactics and techniques observed for a file by hash (SHA-256, SHA-1, or ' +
        'MD5), grouped by the sandbox that observed them. Each technique lists the signatures that ' +
        'triggered it and their severity. Throws when GTI has no record of the hash at all.',
      input: GetFileMitreAttackTechniquesInputSchema,
      handler: async (ctx, input: GetFileMitreAttackTechniquesInput) =>
        getGti(ctx, `/files/${encodeURIComponent(input.fileHash)}/behaviour_mitre_trees`),
    },

    scanUrl: {
      isTool: true,
      scope: 'write',
      description:
        'Submit a URL to GTI for a fresh public analysis. Returns an analysis identifier; poll getAnalysis until it completes, then pass the URL identifier it reports to getUrlScanReport.',
      input: ScanUrlInputSchema,
      handler: async (ctx, input: ScanUrlInput) => postGtiForm(ctx, '/urls', { url: input.url }),
    },

    getAnalysis: {
      isTool: true,
      scope: 'read',
      description:
        'Get the status and statistics of a public URL analysis submitted by scanUrl. The response also carries the URL identifier, at meta.url_info.id, needed by getUrlScanReport once the analysis completes.',
      input: GetAnalysisInputSchema,
      handler: async (ctx, input: GetAnalysisInput) =>
        getGti(ctx, `/analyses/${encodeURIComponent(input.analysisId)}`),
    },

    getUrlScanReport: {
      isTool: true,
      scope: 'read',
      description:
        'Get the GTI reputation and detection report for a URL submitted through scanUrl, using the URL identifier from getAnalysis rather than the URL itself. Wraps the same endpoint as getUrlReport, kept separate because its input is an identifier rather than a URL to derive one from.',
      input: GetUrlScanReportInputSchema,
      handler: async (ctx, input: GetUrlScanReportInput) =>
        getGti(ctx, `/urls/${encodeURIComponent(input.urlId)}`),
    },

    scanPrivateUrl: {
      isTool: true,
      scope: 'write',
      description:
        'Submit a URL to GTI for a private analysis, sharing neither the URL nor the resulting analysis with the wider GTI community. Returns an analysis identifier; poll getPrivateAnalysis until it completes, then pass the URL identifier it reports to getPrivateUrlReport.',
      input: ScanPrivateUrlInputSchema,
      handler: async (ctx, input: ScanPrivateUrlInput) =>
        postGtiForm(ctx, '/private/urls', buildPrivateScanBody(input)),
    },

    getPrivateAnalysis: {
      isTool: true,
      scope: 'read',
      description:
        'Get the status and statistics of a private URL analysis submitted by scanPrivateUrl. The response also carries the URL identifier, at meta.url_info.id, needed by getPrivateUrlReport once the analysis completes.',
      input: GetPrivateAnalysisInputSchema,
      handler: async (ctx, input: GetPrivateAnalysisInput) =>
        getGti(ctx, `/private/analyses/${encodeURIComponent(input.analysisId)}`),
    },

    getPrivateUrlReport: {
      isTool: true,
      scope: 'read',
      description:
        'Get the GTI reputation and detection report for a URL submitted through scanPrivateUrl, using the URL identifier from getPrivateAnalysis rather than the URL itself.',
      input: GetPrivateUrlReportInputSchema,
      handler: async (ctx, input: GetPrivateUrlReportInput) =>
        getGti(ctx, `/private/urls/${encodeURIComponent(input.urlId)}`),
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
    '## Choosing report vs. relationship vs. sandbox actions',
    '- For a quick reputation/verdict check on an IP, domain, URL, or file hash, use the matching ' +
      '`get*Report` action. To traverse what an IOC is connected to (resolutions, contacted files, ' +
      'downloaded files, redirects, and similar), use the matching `get*Relationship` action ' +
      'instead. For file hashes specifically, `getFileReport` (reputation) is distinct from ' +
      '`getFileBehaviours` (sandbox detonation reports) and `getFileMitreAttackTechniques` (ATT&CK ' +
      'techniques observed during detonation); all three can be called for the same hash and ' +
      'return different things.',
    '- `advancedSearch` finds IOCs across the whole GTI corpus by query. Use it when you do not ' +
      'already have an identifier; use the `get*Report` actions when you do.',
    '',
    '## Whether a report action throws for an unknown IOC differs by type',
    '- `getDomainReport`, `getUrlReport`, `getFileReport`, `getFileBehaviours`, and ' +
      '`getFileMitreAttackTechniques` all throw when GTI has no record of the identifier at all. ' +
      '`getIpReport` does not: it succeeds for any well-formed IP address, even private or ' +
      'reserved ones with no real internet presence.',
    '',
    '## Relationship names are not enumerated by this connector',
    '- Do not guess a `relationship` value from a sibling IOC type; the valid set differs per ' +
      'object type and GTI can add or remove values over time. An unrecognized value throws a 404 ' +
      'from GTI itself, not a schema error. See each `relationship` parameter description for a ' +
      'link to the current published set for that IOC type.',
    '',
    '## URL identifiers are exact-string, not normalized',
    "- `getUrlReport` and `getUrlRelationship` derive GTI's identifier as the base64url encoding " +
      'of the URL exactly as supplied. Scheme, "www.", and a trailing slash all change the ' +
      'identifier, so "http://example.com" and "https://www.example.com/" are different lookups ' +
      'even if they resolve to the same site.',
    '',
    '## Search and paging',
    '- Pass the returned cursor unchanged to fetch the next page. GTI list and search actions return up to 40 items per page.',
    '- Every relationship, list, and search action shares the same limit and cursor parameters.',
    '- Fuzzy-hash corpus searches are typically limited to 15 requests per minute.',
    '',
    '## IOC stream',
    '- IOC stream notifications expire after 30 days. Use date filters and persist the returned cursor for incremental collection.',
    '',
    '## Public vs. private URL scanning',
    '- `scanUrl` submits a URL for public analysis; `scanPrivateUrl` does the same without sharing ' +
      'the URL or the resulting analysis with the wider GTI community. Both accept the URL in its ' +
      'natural form, the same as `getUrlReport`.',
    '',
    '## Scan results require polling, not a single call',
    '- `scanUrl`/`scanPrivateUrl` return only an analysis identifier. Poll `getAnalysis`/' +
      '`getPrivateAnalysis` at an interval until the status is completed; this connector does not ' +
      'poll on its own. The completed response carries the URL identifier (`meta.url_info.id`) ' +
      'needed by `getUrlScanReport`/`getPrivateUrlReport`.',
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
