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
import { isAxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec';
import {
  PaginationSchema,
  SearchIndicatorsInputSchema,
  SearchObjectsInputSchema,
  GetIndicatorInputSchema,
  GetObjectInputSchema,
  GetRelatedObjectsInputSchema,
  CreateIndicatorInputSchema,
  UpdateIndicatorStatusInputSchema,
  AddAttributeInputSchema,
  CreateEventInputSchema,
  CreateAdversaryInputSchema,
  LinkObjectsInputSchema,
  GetPluginInputSchema,
  ExecutePluginInputSchema,
  type JsonValue,
  type Pagination,
  type SearchIndicatorsInput,
  type SearchObjectsInput,
  type GetIndicatorInput,
  type GetObjectInput,
  type GetRelatedObjectsInput,
  type CreateIndicatorInput,
  type UpdateIndicatorStatusInput,
  type AddAttributeInput,
  type CreateEventInput,
  type CreateAdversaryInput,
  type LinkObjectsInput,
  type GetPluginInput,
  type ExecutePluginInput,
} from './types';

const request = async (ctx: ActionContext, options: AxiosRequestConfig): Promise<JsonValue> => {
  const { url, clientId } = ctx.config ?? {};
  const { username, password } = ctx.secrets ?? {};
  if (
    typeof url !== 'string' ||
    typeof clientId !== 'string' ||
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    !url ||
    !clientId ||
    !username ||
    !password
  ) {
    throw new Error('ThreatQ requires an instance URL, client ID, email, and password.');
  }
  const baseUrl = `${url.replace(/\/+$/, '').replace(/\/api$/, '')}/api`;
  // The basic auth fields store account credentials; ThreatQ requests use OAuth tokens.
  delete ctx.client.defaults.auth;
  let token: string;
  try {
    const { data } = await ctx.client.post<{ access_token?: string }>(
      `${baseUrl}/token`,
      {
        email: username,
        password,
        grant_type: 'password',
        client_id: clientId,
      },
      { maxRedirects: 0, headers: { 'Content-Type': 'application/json' } }
    );
    if (typeof data.access_token !== 'string' || !data.access_token) {
      throw new Error('Missing access token');
    }
    token = data.access_token;
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    // Do not expose the token request body or a server response that can contain credentials.
    throw new Error(
      `ThreatQ authentication failed${
        status ? ` (HTTP ${status})` : ''
      }. Check the account credentials and client ID.`
    );
  }
  try {
    const { data } = await ctx.client.request<JsonValue>({
      ...options,
      url: `${baseUrl}${options.url}`,
      maxRedirects: 0,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    throw new Error(
      `ThreatQ request failed${
        status ? ` (HTTP ${status})` : ''
      }. Check the account permissions, input, and instance connection.`
    );
  }
};

export const ThreatQ: ConnectorSpec = {
  metadata: {
    id: '.threatq',
    displayName: 'ThreatQ',
    description: i18n.translate('core.kibanaConnectorSpecs.threatq.metadata.description', {
      defaultMessage:
        'Search and enrich ThreatQ intelligence, update indicators, link objects, and run plugin actions',
    }),
    minimumLicense: 'gold',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder', 'workflows'],
  },
  auth: {
    types: [
      {
        type: 'basic',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.threatq.auth.label', {
            defaultMessage: 'ThreatQ account',
          }),
          meta: {
            username: {
              label: i18n.translate('core.kibanaConnectorSpecs.threatq.auth.emailLabel', {
                defaultMessage: 'Email',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.threatq.auth.emailHelpText', {
                defaultMessage:
                  'ThreatQ account with read access to the requested objects. Changes require write access, and plugin actions require permission to run the selected operation.',
              }),
            },
            password: {
              label: i18n.translate('core.kibanaConnectorSpecs.threatq.auth.passwordLabel', {
                defaultMessage: 'Password',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.threatq.auth.passwordHelpText', {
                defaultMessage:
                  'Account password exchanged for a temporary OAuth token for each action. The account must support password authentication.',
              }),
            },
          },
        },
      },
    ],
  },
  schema: lazySchema(() =>
    z.object({
      url: UISchemas.url('https://threatq.example.com')
        .max(2048)
        .refine((value) => {
          if (!URL.canParse(value)) return false;
          const parsed = new URL(value);
          return (
            parsed.protocol === 'https:' &&
            !parsed.username &&
            !parsed.password &&
            !parsed.search &&
            !parsed.hash &&
            /^\/(api\/?)?$/.test(parsed.pathname)
          );
        }, 'Enter an HTTPS instance URL, optionally ending in /api, without credentials, query parameters, or a fragment.')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.threatq.config.urlLabel', {
            defaultMessage: 'ThreatQ URL',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.threatq.config.urlHelpText', {
            defaultMessage:
              'HTTPS URL of your hosted or on-premises ThreatQ instance, for example https://threatq.example.com. The instance must be reachable from Kibana.',
          }),
        }),
      clientId: z
        .string()
        .min(1)
        .max(200)
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.threatq.config.clientIdLabel', {
            defaultMessage: 'OAuth client ID',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.threatq.config.clientIdHelpText', {
            defaultMessage:
              'Client ID from the instance /assets/js/config.js file. Ask your ThreatQ administrator for this value.',
          }),
        }),
    })
  ),
  validateUrls: { fields: ['url'] },
  actions: {
    searchIndicators: {
      isTool: true,
      scope: 'read',
      input: SearchIndicatorsInputSchema,
      description:
        'Search indicators with ThreatQ criteria and filters for value, type, status, or score. Use this to check an IOC before enrichment. Returns one page with the original data and total fields.',
      handler: async (ctx, { criteria, filters, ...params }: SearchIndicatorsInput) =>
        request(ctx, {
          method: 'POST',
          url: '/indicators/query',
          params,
          data: { criteria, filters },
        }),
    },
    searchObjects: {
      isTool: true,
      scope: 'read',
      input: SearchObjectsInputSchema,
      description:
        'Search the Threat Library by object type, including reports, malware, events, and adversaries. Returns the original result envelope, including total and nextCursorMark when present.',
      handler: async (
        ctx,
        { objectType, criteria, filters, cursorMark, offset, ...params }: SearchObjectsInput
      ) =>
        request(ctx, {
          method: 'POST',
          url: `/${objectType}/query`,
          params: { ...params, ...(cursorMark ? { cursorMark } : { offset }) },
          data: { criteria, filters },
        }),
    },
    getIndicator: {
      isTool: true,
      scope: 'read',
      input: GetIndicatorInputSchema,
      description:
        'Get an indicator by ID with attributes, sources, score, status, adversaries, and events by default. Use with to select additional relationships supported by your instance. Returns the original ThreatQ data envelope.',
      handler: async (ctx, { indicatorId, with: relationships }: GetIndicatorInput) =>
        request(ctx, {
          method: 'GET',
          url: `/indicators/${indicatorId}`,
          params: { with: relationships.join(',') },
        }),
    },
    getObject: {
      isTool: true,
      scope: 'read',
      input: GetObjectInputSchema,
      description:
        'Get an adversary, event, report, or other ThreatQ object by type and ID. Set with to request descriptions and related TTPs or attack patterns supported by the instance. Returns the original ThreatQ data envelope.',
      handler: async (ctx, { objectType, objectId, with: relationships }: GetObjectInput) =>
        request(ctx, {
          method: 'GET',
          url: `/${objectType}/${objectId}`,
          params: { with: relationships?.join(',') },
        }),
    },
    getRelatedObjects: {
      isTool: true,
      scope: 'read',
      input: GetRelatedObjectsInputSchema,
      description:
        'Get one page of indicators, events, or adversaries linked to an indicator, event, or adversary. Use this to expand an investigation from a known object. Returns relationship records and pagination metadata.',
      handler: async (
        ctx,
        {
          objectType,
          objectId,
          relatedType,
          with: relationships,
          ...params
        }: GetRelatedObjectsInput
      ) =>
        request(ctx, {
          method: 'GET',
          url: `/${objectType}/${objectId}/${relatedType}`,
          params: { ...params, with: relationships?.join(',') },
        }),
    },
    createIndicator: {
      isTool: true,
      scope: 'write',
      input: CreateIndicatorInputSchema,
      description:
        'Add one indicator using a value, type ID, and status ID. Discover IDs with listIndicatorTypes and listIndicatorStatuses first. Returns the API result array and its existing flag when ThreatQ already knows the indicator.',
      handler: async (ctx, { value, typeId, statusId, sources }: CreateIndicatorInput) =>
        request(ctx, {
          method: 'POST',
          url: '/indicators',
          data: [{ value, type_id: typeId, status_id: statusId, sources }],
        }),
    },
    updateIndicatorStatus: {
      isTool: true,
      scope: 'destroy',
      input: UpdateIndicatorStatusInputSchema,
      description:
        'Change only an indicator status after triage. Use listIndicatorStatuses to find the target status ID. Returns the updated indicator in the ThreatQ data envelope.',
      handler: async (ctx, { indicatorId, statusId }: UpdateIndicatorStatusInput) =>
        request(ctx, {
          method: 'PUT',
          url: `/indicators/${indicatorId}`,
          data: { status_id: statusId },
        }),
    },
    addAttribute: {
      isTool: true,
      scope: 'write',
      input: AddAttributeInputSchema,
      description:
        'Attach a named attribute to an indicator, event, or adversary to record investigation findings. Returns the created attribute and source information in the ThreatQ response.',
      handler: async (ctx, { objectType, objectId, ...data }: AddAttributeInput) =>
        request(ctx, {
          method: 'POST',
          url: `/${objectType}/${objectId}/attributes`,
          data,
        }),
    },
    createEvent: {
      isTool: true,
      scope: 'write',
      input: CreateEventInputSchema,
      description:
        'Create a ThreatQ event from an alert or investigation. Supply an event type configured in the instance and a UTC event time. Returns the event record and ID for linkObjects.',
      handler: async (ctx, { happenedAt, ...data }: CreateEventInput) =>
        request(ctx, {
          method: 'POST',
          url: '/events',
          data: { ...data, happened_at: happenedAt },
        }),
    },
    createAdversary: {
      isTool: true,
      scope: 'write',
      input: CreateAdversaryInputSchema,
      description:
        'Create an adversary by name with optional source records. Use searchObjects first to check for an existing actor. Returns the adversary record and ID for linkObjects.',
      handler: async (ctx, input: CreateAdversaryInput) =>
        request(ctx, { method: 'POST', url: '/adversaries', data: input }),
    },
    linkObjects: {
      isTool: true,
      scope: 'write',
      input: LinkObjectsInputSchema,
      description:
        'Link two existing indicators, events, or adversaries. Returns the related object and relationship metadata. Read the link with getRelatedObjects.',
      handler: async (ctx, { objectType, objectId, relatedType, relatedId }: LinkObjectsInput) =>
        request(ctx, {
          method: 'POST',
          url: `/${objectType}/${objectId}/${relatedType}`,
          data: [{ id: relatedId }],
        }),
    },
    listIndicatorStatuses: {
      isTool: true,
      scope: 'read',
      input: PaginationSchema,
      description:
        'List configured indicator statuses and IDs. Use before creating an indicator or updating its status; do not assume status IDs. Returns one page of statuses and total.',
      handler: async (ctx, input: Pagination) =>
        request(ctx, { method: 'GET', url: '/indicator/statuses', params: input }),
    },
    listIndicatorTypes: {
      isTool: true,
      scope: 'read',
      input: PaginationSchema,
      description:
        'List indicator type names, IDs, and classes. Use before createIndicator to resolve a type such as IP Address or FQDN. Returns one page of types and total.',
      handler: async (ctx, input: Pagination) =>
        request(ctx, { method: 'GET', url: '/indicator/types', params: input }),
    },
    listPlugins: {
      isTool: true,
      scope: 'read',
      input: PaginationSchema,
      description:
        'List installed ThreatQ plugins (operations), including their IDs and enabled state. Use getPlugin next to discover action names and supported object types. Returns one page of plugins and total.',
      handler: async (ctx, input: Pagination) =>
        request(ctx, { method: 'GET', url: '/plugins', params: input }),
    },
    getPlugin: {
      isTool: true,
      scope: 'read',
      input: GetPluginInputSchema,
      description:
        'Get a plugin with its action and objectType relationships. Use this to obtain the action name and case-sensitive object type for executePlugin. Returns the plugin data envelope.',
      handler: async (ctx, { pluginId }: GetPluginInput) =>
        request(ctx, {
          method: 'GET',
          url: `/plugins/${pluginId}`,
          params: { with: 'action,objectType' },
        }),
    },
    executePlugin: {
      isTool: false,
      scope: 'destroy',
      input: ExecutePluginInputSchema,
      description:
        'Run a configured ThreatQ plugin action against an object. This can change intelligence or call external services. Check getPlugin before selecting the operation. Returns the plugin result, which depends on the selected operation.',
      handler: async (ctx, { pluginId, objectId, type, action }: ExecutePluginInput) =>
        request(ctx, {
          method: 'POST',
          url: `/plugins/${pluginId}/execute`,
          data: { type, id: String(objectId), action },
        }),
    },
  },
  test: {
    enabled: true,
    handler: async (ctx) => {
      await request(ctx, { method: 'GET', url: '/indicator/types', params: { limit: 1 } });
      return { message: 'Connected to ThreatQ.' };
    },
  },
  skill: [
    '## ThreatQ investigation',
    '',
    'Search an alert indicator, then use getIndicator to read its score, status, attributes, and sources.',
    'Use getRelatedObjects to find linked indicators, events, or adversaries; use getObject to read each result.',
    'For report details, use report. For report searches, use the endpoint name supported by the instance (the API reference lists reports). The with relationship names vary by ThreatQ version and installed object definitions.',
    'Use the IDs returned by listIndicatorStatuses and listIndicatorTypes before creating or updating indicators.',
    'Record the triage decision with updateIndicatorStatus and addAttribute. Use linkObjects to attach an investigation event or actor.',
    'Search and list actions return one page. Advance offset by limit, or pass the returned nextCursorMark to searchObjects. Stop cursor pagination when nextCursorMark is unchanged.',
    'Plugin execution can have external effects. Discover installed operations and their actions first; executePlugin is not exposed as an agent tool.',
  ].join('\n'),
};
