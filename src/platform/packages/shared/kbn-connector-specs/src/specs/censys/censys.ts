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
import type { AxiosRequestConfig } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  CensEyeJobResultInputSchema,
  RescanInputSchema,
  ScanStatusInputSchema,
  CensEyeCreateAnalysisJobInputSchema,
  GetCertificateInputSchema,
  GetHostHistoryInputSchema,
  GetHostInputSchema,
  GetWebPropertyInputSchema,
  CensEyeJobStatusInputSchema,
  formatWebProperty,
} from './types';
import type {
  CensEyeJobResultInput,
  RescanInput,
  ScanStatusInput,
  CensEyeCreateAnalysisJobInput,
  GetCertificateInput,
  GetHostHistoryInput,
  GetHostInput,
  GetWebPropertyInput,
  CensEyeJobStatusInput,
} from './types';

const CENSYS_API_BASE_URL = 'https://api.platform.censys.io';
const CENSYS_INTEGRATION_VERSION = '1.0.0';
const NODE_VERSION = process.versions.node;

let kibanaVersionPromise: Promise<string> | undefined;

const getKibanaVersion = (): Promise<string> => {
  if (!kibanaVersionPromise) {
    kibanaVersionPromise = import('@kbn/repo-info').then(
      ({ kibanaPackageJson }) => kibanaPackageJson.version
    );
  }
  return kibanaVersionPromise;
};

const getOrganizationId = (ctx: ActionContext): string => {
  const organizationId = (ctx.config as { organizationId?: string } | undefined)?.organizationId;
  if (!organizationId) {
    throw new Error(
      'Censys connector requires an organization ID. Set it in the connector configuration.'
    );
  }
  return organizationId;
};

function throwCensysError(error: unknown): void {
  const axiosError = error as {
    response?: {
      status?: number;
      data?: {
        detail?: string;
        message?: string;
        title?: string;
        reason?: string;
        errors?: Array<{ message?: string; location?: string }>;
        error?: {
          code?: number;
          status?: string;
          reason?: string;
          message?: string;
          request?: string;
        };
      };
    };
  };
  const data = axiosError.response?.data;
  const nested = data?.error;

  const status = nested?.code ?? axiosError.response?.status;
  const baseMessage =
    nested?.message ?? nested?.reason ?? data?.detail ?? data?.message ?? data?.title;
  if (!baseMessage) return;

  const reason = nested?.reason && nested.reason !== baseMessage ? nested.reason : undefined;

  const fieldErrors = data?.errors
    ?.map((e) => (e.location ? `${e.location}: ${e.message ?? 'invalid'}` : e.message))
    .filter(Boolean)
    .join('; ');

  const details = [reason, fieldErrors].filter(Boolean).join('; ');

  throw new Error(
    `Censys API error (${status ?? 'unknown'}): ${baseMessage}${details ? ` - ${details}` : ''}`
  );
}

const buildUserAgent = async (): Promise<string> => {
  const kibanaVersion = await getKibanaVersion();
  const timestamp = Math.floor(Date.now() / 1000);
  return `CensysKibana/${CENSYS_INTEGRATION_VERSION} (Kibana/${kibanaVersion}; Node/${NODE_VERSION}; ts=${timestamp})`;
};

const buildRequestConfig = async (
  ctx: ActionContext,
  extra: Pick<AxiosRequestConfig, 'params' | 'headers' | 'responseType'> = {}
): Promise<AxiosRequestConfig> => {
  const organizationId = getOrganizationId(ctx);
  return {
    ...extra,
    params: { organization_id: organizationId, ...(extra.params ?? {}) },
    headers: { 'User-Agent': await buildUserAgent(), ...(extra.headers ?? {}) },
  };
};

const buildCenseyeTarget = (input: CensEyeCreateAnalysisJobInput): Record<string, unknown> => {
  if (input.type === 'host') {
    return { host_id: input.host };
  }
  if (input.type === 'webproperty') {
    const { hostname, port } = input;
    return { webproperty_id: formatWebProperty(hostname, port) };
  }
  return { certificate_id: input.certificate };
};

export const CensysConnector: ConnectorSpec = {
  metadata: {
    id: '.censys',
    displayName: 'Censys',
    description: i18n.translate('connectorSpecs.censys.metadata.description', {
      defaultMessage:
        'This connector implements investigative actions to get IP, domain and certificate data from the Censys Platform.',
    }),
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {},
        overrides: { meta: { token: { label: 'API Token', placeholder: 'censys_...' } } },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      organizationId: z
        .string()
        .uuid({ message: 'Organization ID must be a valid UUID' })
        .describe('Censys organization ID')
        .meta({
          label: 'Organization ID',
          widget: 'text',
          placeholder: '',
        }),
    })
  ),

  actions: {
    getHost: {
      isTool: true,
      description:
        'Retrieve enrichment data for a single host by IP address. Returns the host record including services, ports, location, ASN, and last-scan metadata.',
      input: GetHostInputSchema,
      handler: async (ctx, input: GetHostInput) => {
        try {
          const url = `${CENSYS_API_BASE_URL}/v3/global/asset/host/${input.host}`;
          const response = await ctx.client.get(url, await buildRequestConfig(ctx));
          return response.data;
        } catch (error: unknown) {
          throwCensysError(error);
          throw error;
        }
      },
    },

    getWebProperty: {
      isTool: true,
      description:
        'Retrieve enrichment data for a web property identified by hostname or IP and port. Returns banner data, certificates, software, and HTTP response metadata observed on the listener.',
      input: GetWebPropertyInputSchema,
      handler: async (ctx, input: GetWebPropertyInput) => {
        try {
          const webPropertyId = formatWebProperty(input.hostname, input.port);
          const url = `${CENSYS_API_BASE_URL}/v3/global/asset/webproperty/${encodeURIComponent(
            webPropertyId
          )}`;
          const response = await ctx.client.get(url, await buildRequestConfig(ctx));
          return response.data;
        } catch (error: unknown) {
          throwCensysError(error);
          throw error;
        }
      },
    },

    getCertificate: {
      isTool: true,
      description:
        'Retrieve a certificate record by its SHA-256 fingerprint. Returns subject, issuer, validity window, parsed fields, and Censys observation metadata.',
      input: GetCertificateInputSchema,
      handler: async (ctx, input: GetCertificateInput) => {
        try {
          const url = `${CENSYS_API_BASE_URL}/v3/global/asset/certificate/${encodeURIComponent(
            input.certificate
          )}`;
          const response = await ctx.client.get(url, await buildRequestConfig(ctx));
          return response.data;
        } catch (error: unknown) {
          throwCensysError(error);
          throw error;
        }
      },
    },

    getHostHistory: {
      isTool: true,
      description:
        'Retrieve the chronological scan timeline for a host over a time window. Use to see how services, banners, and certificates on the host changed between startTime and endTime.',
      input: GetHostHistoryInputSchema,
      handler: async (ctx, input: GetHostHistoryInput) => {
        try {
          const url = `${CENSYS_API_BASE_URL}/v3/global/asset/host/${input.host}/timeline`;
          const response = await ctx.client.get(
            url,
            await buildRequestConfig(ctx, {
              params: {
                start_time: input.endTime,
                end_time: input.startTime,
              },
            })
          );
          return response.data;
        } catch (error: unknown) {
          throwCensysError(error);
          throw error;
        }
      },
    },

    rescan: {
      isTool: true,
      description:
        'Submit a host service (IP+port+protocol+transportProtocol) or a web property (hostname-or-IP+port) for a fresh scan. Returns a scan ID; poll scanStatus until the scan completes.',
      input: RescanInputSchema,
      handler: async (ctx, input: RescanInput) => {
        try {
          const url = `${CENSYS_API_BASE_URL}/v3/global/scans/rescan`;
          const body =
            input.type === 'service'
              ? {
                  target: {
                    service_id: {
                      ip: input.ip,
                      port: input.port,
                      protocol: input.protocol,
                      transport_protocol: input.transportProtocol,
                    },
                  },
                }
              : {
                  target: {
                    web_origin: {
                      hostname: input.hostname,
                      port: input.port,
                    },
                  },
                };
          const response = await ctx.client.post(url, body, await buildRequestConfig(ctx));
          return response.data;
        } catch (error: unknown) {
          throwCensysError(error);
          throw error;
        }
      },
    },

    scanStatus: {
      isTool: true,
      description:
        'Poll the status of a rescan submitted via rescan. Returns a `result` object with `completed`, `tracked_scan_id`, per-task `tasks[].status`, and the rescan `target`. Poll until `result.completed` is true.',
      input: ScanStatusInputSchema,
      handler: async (ctx, input: ScanStatusInput) => {
        try {
          const url = `${CENSYS_API_BASE_URL}/v3/global/scans/${encodeURIComponent(input.scanId)}`;
          const response = await ctx.client.get(url, await buildRequestConfig(ctx));
          return response.data;
        } catch (error: unknown) {
          throwCensysError(error);
          throw error;
        }
      },
    },

    censEyeCreateAnalysisJob: {
      isTool: true,
      description:
        'Submit a Censeye related-infrastructure threat-hunting job for a host, web property, or certificate. Returns a job ID; poll censEyeJobStatus, then call censEyeJobResult to fetch the pivots.',
      input: CensEyeCreateAnalysisJobInputSchema,
      handler: async (ctx, input: CensEyeCreateAnalysisJobInput) => {
        try {
          const url = `${CENSYS_API_BASE_URL}/v3/threat-hunting/censeye/jobs`;
          const target = buildCenseyeTarget(input);
          const response = await ctx.client.post(url, { target }, await buildRequestConfig(ctx));
          return response.data;
        } catch (error: unknown) {
          throwCensysError(error);
          throw error;
        }
      },
    },

    censEyeJobStatus: {
      isTool: true,
      description:
        'Poll the status of a Censeye job submitted via censEyeCreateAnalysisJob. Returns a `result` object with `state` ("started", "completed", "failed", "unknown"), `result_count`, and job metadata. Poll until `result.state` is "completed".',
      input: CensEyeJobStatusInputSchema,
      handler: async (ctx, input: CensEyeJobStatusInput) => {
        try {
          const url = `${CENSYS_API_BASE_URL}/v3/threat-hunting/censeye/jobs/${encodeURIComponent(
            input.jobId
          )}`;
          const response = await ctx.client.get(url, await buildRequestConfig(ctx));
          return response.data;
        } catch (error: unknown) {
          throwCensysError(error);
          throw error;
        }
      },
    },

    censEyeJobResult: {
      isTool: true,
      description:
        'Retrieve results from a completed Censeye job. Returns a `result` object with `results[]` entries containing `count` and `field_value_pairs` (related-infrastructure pivots). Call only after `censEyeJobStatus` reports `result.state` of "completed".',
      input: CensEyeJobResultInputSchema,
      handler: async (ctx, input: CensEyeJobResultInput) => {
        try {
          const url = `${CENSYS_API_BASE_URL}/v3/threat-hunting/censeye/jobs/${encodeURIComponent(
            input.jobId
          )}/results`;
          const response = await ctx.client.get(url, await buildRequestConfig(ctx));
          return response.data;
        } catch (error: unknown) {
          throwCensysError(error);
          throw error;
        }
      },
    },
  },

  skill: [
    '## Censys Platform connector',
    '',
    "Every request is scoped to the connector's configured Censys organization (sent as `?organization_id=<uuid>`).",
    '',
    '## Enrichment',
    '- Use `getHost` for IP-based enrichment (services, ports, ASN, geo).',
    '- Use `getWebProperty` for a hostname-or-IP+port listener (HTTP banners, TLS, software).',
    '- Use `getCertificate` for SHA-256 certificate fingerprints.',
    "- Use `getHostHistory` to see how a host's services and banners changed over a time window.",
    '',
    '## Rescan flow',
    '1. Call `rescan` with either a service (ip+port+protocol+transportProtocol) or a web property (hostname-or-IP+port).',
    '2. The response includes a scan ID. Poll `scanStatus` until `result.completed` is true.',
    '3. After completion, re-fetch the asset with `getHost` or `getWebProperty` to see fresh data.',
    '',
    '## Censeye threat-hunting flow',
    '1. Call `censEyeCreateAnalysisJob` with exactly one of `host`, `webProperty`, or `certificate`.',
    '2. The response includes a job ID. Poll `censEyeJobStatus` until `result.state` is `completed`.',
    '3. Call `censEyeJobResult` with the job ID to retrieve related-infrastructure pivots.',
    '',
    '## Identifier formats',
    '- Host ID: an IPv4 or IPv6 address.',
    '- Web property ID: an object `{ hostname, port }` (e.g., `{ hostname: "example.com", port: 443 }` or `{ hostname: "2001:db8::1", port: 443 }`). Pass the IPv6 address as a plain hostname — the connector adds the `[...]` brackets when calling the API.',
    '- Certificate ID: the 64-character lowercase SHA-256 fingerprint.',
  ].join('\n'),

  test: {
    description: i18n.translate('connectorSpecs.censys.test.description', {
      defaultMessage:
        'Verifies Censys API credentials and organization access by fetching the configured organization',
    }),
    handler: async (ctx) => {
      try {
        const organizationId = getOrganizationId(ctx);
        await ctx.client.get(
          `${CENSYS_API_BASE_URL}/v3/accounts/organizations/${encodeURIComponent(organizationId)}`,
          await buildRequestConfig(ctx)
        );
        return { ok: true, message: 'Successfully connected to Censys Platform API' };
      } catch (error) {
        try {
          throwCensysError(error);
        } catch (enriched) {
          return {
            ok: false,
            message: enriched instanceof Error ? enriched.message : String(enriched),
          };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, message: `Failed to connect Censys API: ${message}` };
      }
    },
  },
};
