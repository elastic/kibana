/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * MISP connector — attribute/event search, indicator checks, warninglists, and
 * write-back (sightings / events / attributes / tags / publish) for workflows.
 *
 * Auth: automation API key in `Authorization` (raw key, not Bearer) plus optional
 * TLS verification controls for self-signed MISP instances.
 *
 * https://www.circl.lu/doc/misp/automation/
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosError } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec';
import {
  AddAttributeInputSchema,
  AddSightingInputSchema,
  AddTagToEventInputSchema,
  CheckIndicatorInputSchema,
  CheckWarninglistInputSchema,
  CreateEventInputSchema,
  GetEventInputSchema,
  PublishEventInputSchema,
  SearchAttributesInputSchema,
  SearchEventsInputSchema,
  type AddAttributeInput,
  type AddSightingInput,
  type AddTagToEventInput,
  type CheckIndicatorInput,
  type CheckWarninglistInput,
  type CreateEventInput,
  type GetEventInput,
  type PublishEventInput,
  type SearchAttributesInput,
  type SearchEventsInput,
} from './types';

interface MispConfig {
  url?: string;
}

const getBaseUrl = (ctx: ActionContext): string => {
  const url = ((ctx.config as MispConfig | undefined)?.url ?? '').trim();
  if (!url) {
    throw new Error('MISP connector is missing the required URL configuration field.');
  }
  return url.replace(/\/+$/, '');
};

const formatMispError = (action: string, error: unknown): Error => {
  const err = error as AxiosError<{ message?: string; name?: string; errors?: unknown }>;
  const detail =
    err.response?.data?.message ??
    err.response?.data?.name ??
    (typeof err.response?.data === 'string' ? err.response.data : undefined) ??
    err.message ??
    (error instanceof Error ? error.message : String(error));
  return new Error(
    `MISP ${action} failed (status ${err.response?.status ?? 'unknown'}): ${detail}`
  );
};

const ATTRIBUTE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const setSightingAttributeRef = (body: Record<string, unknown>, attributeId: string): void => {
  if (ATTRIBUTE_UUID_RE.test(attributeId)) {
    body.uuid = attributeId;
  } else {
    body.id = attributeId;
  }
};

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;

const unwrapAttributes = (data: unknown): unknown[] => {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const root = data as Record<string, unknown>;
  const response = root.response;
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === 'object') {
    const attrs = (response as { Attribute?: unknown }).Attribute;
    if (Array.isArray(attrs)) {
      return attrs;
    }
  }
  if (Array.isArray(root.Attribute)) {
    return root.Attribute;
  }
  return [];
};

const unwrapEvents = (data: unknown): unknown[] => {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const root = data as Record<string, unknown>;
  if (Array.isArray(root.response)) {
    return root.response;
  }
  if (root.Event && typeof root.Event === 'object') {
    return [root];
  }
  return [];
};

const buildAttributeSearchBody = (input: {
  value?: string;
  type?: string;
  category?: string;
  tags?: string[];
  eventId?: string;
  limit?: number;
  page?: number;
}): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    returnFormat: 'json',
    limit: input.limit ?? 10,
    page: input.page ?? 1,
  };
  if (input.value) body.value = input.value;
  if (input.type) body.type = input.type;
  if (input.category) body.category = input.category;
  if (input.tags?.length) body.tags = input.tags;
  if (input.eventId) body.eventid = input.eventId;
  return body;
};

export const Misp: ConnectorSpec = {
  metadata: {
    id: '.misp',
    displayName: 'MISP',
    description: i18n.translate('core.kibanaConnectorSpecs.misp.metadata.description', {
      defaultMessage:
        'Search MISP attributes and events, check indicators and warninglists, and write sightings, events, attributes, and tags back to a self-hosted MISP instance',
    }),
    minimumLicense: 'gold',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'api_key_header_with_tls',
        isRecommended: true,
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.misp.auth.apiKey.label', {
            defaultMessage: 'Automation API key',
          }),
          meta: {
            apiKey: {
              label: i18n.translate('core.kibanaConnectorSpecs.misp.auth.apiKey.apiKeyLabel', {
                defaultMessage: 'API key',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.misp.auth.apiKey.helpText', {
                defaultMessage:
                  'MISP automation key sent as Authorization: <key> (no Bearer prefix). Create it under Administration → List Auth Keys. Use verification mode "none" for the self-signed TLS common on local MISP instances.',
              }),
            },
            verificationMode: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.misp.auth.verificationMode.helpText',
                {
                  defaultMessage:
                    'How to verify the MISP TLS certificate. Use "none" for self-signed Docker/dev instances, "full" when the instance presents a publicly trusted certificate.',
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
      url: UISchemas.url('https://misp.example.com')
        .describe('MISP instance base URL')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.misp.config.url.label', {
            defaultMessage: 'MISP URL',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.misp.config.url.helpText', {
            defaultMessage:
              'Base URL of your MISP instance, for example https://misp.example.com or https://localhost. Do not include a trailing slash or /attributes path.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['url'],
  },

  actions: {
    searchAttributes: {
      isTool: true,
      scope: 'read',
      description:
        'Search MISP attributes for an IOC value or type filter. Primary enrichment read during alert triage; returns matching attributes with event context.',
      input: SearchAttributesInputSchema,
      handler: async (ctx, input: SearchAttributesInput) => {
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${baseUrl}/attributes/restSearch`,
            buildAttributeSearchBody(input),
            { headers: jsonHeaders }
          );
          const attributes = unwrapAttributes(response.data);
          return { count: attributes.length, attributes };
        } catch (error) {
          throw formatMispError('searchAttributes', error);
        }
      },
    },

    searchEvents: {
      isTool: true,
      scope: 'read',
      description:
        'Search MISP events by indicator, tag, info, or date range. Event-level complement to attribute search for campaign/tag pivots.',
      input: SearchEventsInputSchema,
      handler: async (ctx, input: SearchEventsInput) => {
        const baseUrl = getBaseUrl(ctx);
        const body: Record<string, unknown> = {
          returnFormat: 'json',
          limit: input.limit ?? 10,
          page: input.page ?? 1,
        };
        if (input.value) body.value = input.value;
        if (input.tags?.length) body.tags = input.tags;
        if (input.eventInfo) body.eventinfo = input.eventInfo;
        if (input.from) body.from = input.from;
        if (input.to) body.to = input.to;
        try {
          const response = await ctx.client.post(`${baseUrl}/events/restSearch`, body, {
            headers: jsonHeaders,
          });
          const events = unwrapEvents(response.data);
          return { count: events.length, events };
        } catch (error) {
          throw formatMispError('searchEvents', error);
        }
      },
    },

    checkIndicator: {
      isTool: true,
      scope: 'read',
      description:
        'Reputation-style lookup for one IOC. Returns a verdict (unknown | known | malicious) plus matching attributes. Empty MISP results mean unknown, not clean.',
      input: CheckIndicatorInputSchema,
      handler: async (ctx, input: CheckIndicatorInput) => {
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${baseUrl}/attributes/restSearch`,
            buildAttributeSearchBody({
              value: input.value,
              type: input.type,
              limit: 50,
              page: 1,
            }),
            { headers: jsonHeaders }
          );
          const attributes = unwrapAttributes(response.data);
          const toIds = attributes.some((item) => {
            const attr =
              item && typeof item === 'object' && 'Attribute' in item
                ? (item as { Attribute?: { to_ids?: boolean | string | number } }).Attribute
                : (item as { to_ids?: boolean | string | number });
            return attr?.to_ids === true || attr?.to_ids === '1' || attr?.to_ids === 1;
          });
          let verdict: 'unknown' | 'known' | 'malicious' = 'unknown';
          if (attributes.length > 0) {
            verdict = toIds ? 'malicious' : 'known';
          }
          return {
            value: input.value,
            found: attributes.length > 0,
            verdict,
            matchCount: attributes.length,
            toIds: attributes.length > 0 ? toIds : null,
            attributes,
          };
        } catch (error) {
          throw formatMispError('checkIndicator', error);
        }
      },
    },

    addSighting: {
      isTool: true,
      scope: 'write',
      description:
        'Record a sighting on a MISP attribute by id/UUID or value so Elastic detections feed observed-in-the-wild signal back into MISP.',
      input: AddSightingInputSchema,
      handler: async (ctx, input: AddSightingInput) => {
        const baseUrl = getBaseUrl(ctx);
        const body: Record<string, unknown> = {
          type: input.type ?? 0,
        };
        if (input.attributeId) {
          setSightingAttributeRef(body, input.attributeId);
        }
        if (input.value) body.value = input.value;
        if (input.source) body.source = input.source;
        try {
          const response = await ctx.client.post(`${baseUrl}/sightings/add`, body, {
            headers: jsonHeaders,
          });
          return response.data;
        } catch (error) {
          throw formatMispError('addSighting', error);
        }
      },
    },

    getEvent: {
      isTool: true,
      scope: 'read',
      description:
        'Fetch a full MISP event by id or UUID including attributes, tags, and objects — the drill-down after a search hit.',
      input: GetEventInputSchema,
      handler: async (ctx, input: GetEventInput) => {
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.get(
            `${baseUrl}/events/view/${encodeURIComponent(input.eventId)}`,
            { headers: jsonHeaders }
          );
          return response.data;
        } catch (error) {
          throw formatMispError('getEvent', error);
        }
      },
    },

    checkWarninglist: {
      isTool: true,
      scope: 'read',
      description:
        'Check indicator values against enabled MISP warninglists so workflows can drop known-benign IOCs.',
      input: CheckWarninglistInputSchema,
      handler: async (ctx, input: CheckWarninglistInput) => {
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${baseUrl}/warninglists/checkValue`,
            input.values,
            { headers: jsonHeaders }
          );
          const hits = response.data && typeof response.data === 'object' ? response.data : {};
          return {
            values: input.values,
            hits,
            hitCount: Object.keys(hits as Record<string, unknown>).length,
          };
        } catch (error) {
          throw formatMispError('checkWarninglist', error);
        }
      },
    },

    createEvent: {
      isTool: true,
      scope: 'write',
      description:
        'Create a MISP event from a detection or case (info/title required). Returns the new event including id/UUID for follow-on attribute and publish steps.',
      input: CreateEventInputSchema,
      handler: async (ctx, input: CreateEventInput) => {
        const baseUrl = getBaseUrl(ctx);
        const event: Record<string, unknown> = {
          info: input.info,
          published: input.published ?? false,
        };
        if (input.distribution !== undefined) event.distribution = input.distribution;
        if (input.threatLevelId !== undefined) event.threat_level_id = input.threatLevelId;
        if (input.analysis !== undefined) event.analysis = input.analysis;
        try {
          const response = await ctx.client.post(
            `${baseUrl}/events/add`,
            { Event: event },
            { headers: jsonHeaders }
          );
          return response.data;
        } catch (error) {
          throw formatMispError('createEvent', error);
        }
      },
    },

    addAttribute: {
      isTool: true,
      scope: 'write',
      description:
        'Add an IOC attribute to an existing MISP event (type, value, optional category / to_ids).',
      input: AddAttributeInputSchema,
      handler: async (ctx, input: AddAttributeInput) => {
        const baseUrl = getBaseUrl(ctx);
        const body: Record<string, unknown> = {
          type: input.type,
          value: input.value,
          to_ids: input.toIds ?? true,
        };
        if (input.category) body.category = input.category;
        if (input.comment) body.comment = input.comment;
        try {
          const response = await ctx.client.post(
            `${baseUrl}/attributes/add/${encodeURIComponent(input.eventId)}`,
            body,
            { headers: jsonHeaders }
          );
          return response.data;
        } catch (error) {
          throw formatMispError('addAttribute', error);
        }
      },
    },

    publishEvent: {
      isTool: true,
      scope: 'write',
      description:
        'Publish a MISP event so it propagates to feeds and sync subscribers — final step of create → enrich → publish.',
      input: PublishEventInputSchema,
      handler: async (ctx, input: PublishEventInput) => {
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${baseUrl}/events/publish/${encodeURIComponent(input.eventId)}`,
            {},
            { headers: jsonHeaders }
          );
          return response.data;
        } catch (error) {
          throw formatMispError('publishEvent', error);
        }
      },
    },

    addTagToEvent: {
      isTool: true,
      scope: 'write',
      description: 'Apply a tag (TLP, workflow state, galaxy cluster) to a MISP event.',
      input: AddTagToEventInputSchema,
      handler: async (ctx, input: AddTagToEventInput) => {
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${baseUrl}/events/addTag`,
            { event: input.eventId, tag: input.tag },
            { headers: jsonHeaders }
          );
          return response.data;
        } catch (error) {
          throw formatMispError('addTagToEvent', error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: 'Verifies connectivity and API key via GET /servers/getVersion.',
    handler: async (ctx) => {
      const baseUrl = getBaseUrl(ctx);
      try {
        const response = await ctx.client.get(`${baseUrl}/servers/getVersion`, {
          headers: jsonHeaders,
        });
        return {
          version: response.data?.version ?? null,
        };
      } catch (error) {
        throw formatMispError('test', error);
      }
    },
  },
};
