/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { AxiosResponse } from 'axios';
import type { ConnectorSpec } from '../../connector_spec';
import {
  SearchCrmObjectsInputSchema,
  GetCrmObjectInputSchema,
  ListOwnersInputSchema,
  SearchDealsInputSchema,
  SearchBroadInputSchema,
  ListPipelinesInputSchema,
} from './types';
import type {
  SearchCrmObjectsInput,
  GetCrmObjectInput,
  ListOwnersInput,
  SearchDealsInput,
  SearchBroadInput,
  ListPipelinesInput,
} from './types';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

export const HubSpotConnector: ConnectorSpec = {
  metadata: {
    id: '.hubspot',
    displayName: 'HubSpot',
    description: i18n.translate('core.kibanaConnectorSpecs.hubspot.metadata.description', {
      defaultMessage: 'Search contacts, companies, deals, tickets, and engagements in HubSpot CRM.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          meta: {
            token: {
              sensitive: true,
              label: i18n.translate('core.kibanaConnectorSpecs.hubspot.auth.token.label', {
                defaultMessage: 'Access Token (Service Key or Private App)',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.hubspot.auth.token.helpText', {
                defaultMessage:
                  'HubSpot Service Key (recommended) from Development > Keys, or a Private App access token ' +
                  '(pat- prefix) from Settings > Integrations > Private Apps.',
              }),
              placeholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            },
          },
        },
      },
      {
        type: 'oauth_authorization_code',
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
          },
        },
        defaults: {
          authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
          tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
          scope:
            'crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read tickets crm.objects.owners.read sales-email-read',
          useBasicAuth: false,
        },
      },
    ],
  },

  actions: {
    searchCrmObjects: {
      isTool: true,
      description:
        'Search or list one HubSpot CRM object type: contacts, companies, deals, tickets, or engagements ' +
        '(calls, emails, meetings, notes, tasks). Omit query to list pages. For contacts with includeAssociatedDeals, ' +
        'the response includes linked deal IDs.',
      input: SearchCrmObjectsInputSchema,
      handler: async (ctx, input: SearchCrmObjectsInput) => {
        let contacts: Array<{ id: string; properties: Record<string, unknown> }> | undefined;

        const paramsOrBody: Record<string, unknown> = {
          limit: input.limit ?? 10,
        };
        if (input.after) {
          paramsOrBody.after = input.after;
        }

        let response: AxiosResponse;
        if (input.query) {
          // Use the CRM search API when a query is provided (body accepts `properties` as string[])
          paramsOrBody.query = input.query;
          if (input.properties?.length) {
            paramsOrBody.properties = input.properties;
          }
          response = await ctx.client.post(
            `${HUBSPOT_API_BASE}/crm/v3/objects/${input.objectType}/search`,
            paramsOrBody
          );
        } else {
          // Use the list API when no query is provided (query param `properties` is comma-separated)
          if (input.properties?.length) {
            paramsOrBody.properties = input.properties.join(',');
          }
          response = await ctx.client.get(
            `${HUBSPOT_API_BASE}/crm/v3/objects/${input.objectType}`,
            { params: paramsOrBody }
          );
        }

        if (input.objectType === 'contacts' && input.includeAssociatedDeals) {
          contacts = response.data?.results ?? [];
          // Fetch associated deals for matched contacts
          if (!contacts || contacts.length === 0) {
            return { contacts: [], associated_deals: [] };
          }
          const assocResponse = await ctx.client.post(
            `${HUBSPOT_API_BASE}/crm/v3/associations/contacts/deals/batch/read`,
            { inputs: contacts.map(({ id }) => ({ id })) }
          );
          return { contacts, associated_deals: assocResponse.data?.results ?? [] };
        } else {
          return response.data;
        }
      },
    },

    getCrmObject: {
      isTool: true,
      description:
        'Retrieve one CRM record by object type and ID. For tickets, fetches linked notes (body text) when ' +
        'CRM scopes allow.',
      input: GetCrmObjectInputSchema,
      handler: async (ctx, input: GetCrmObjectInput) => {
        const params: Record<string, unknown> = {};
        if (input.properties?.length) {
          params.properties = input.properties.join(',');
        }

        const response = await ctx.client.get(
          `${HUBSPOT_API_BASE}/crm/v3/objects/${input.objectType}/${input.objectId}`,
          { params }
        );
        const record = response.data as Record<string, unknown>;

        if (input.objectType === 'tickets') {
          try {
            const assocResponse = await ctx.client.post(
              `${HUBSPOT_API_BASE}/crm/v4/associations/tickets/notes/batch/read`,
              { inputs: [{ id: input.objectId }] },
              { validateStatus: () => true }
            );
            if (assocResponse.status !== 200) {
              return { ...record, notes: [] };
            }
            const assocResults = assocResponse.data?.results as
              | Array<{ to?: Array<{ toObjectId: string }> }>
              | undefined;
            const noteIds =
              assocResults?.flatMap((r) => r.to?.map((t) => t.toObjectId) ?? []) ?? [];
            if (noteIds.length === 0) {
              return { ...record, notes: [] };
            }
            const notesResponse = await ctx.client.post(
              `${HUBSPOT_API_BASE}/crm/v3/objects/notes/batch/read`,
              {
                inputs: noteIds.map((id) => ({ id })),
                properties: ['hs_note_body'],
                propertiesWithHistory: [],
              },
              { validateStatus: () => true }
            );
            if (notesResponse.status !== 200) {
              return { ...record, notes: [] };
            }
            const rawResults =
              (
                notesResponse.data as {
                  results?: Array<{
                    id: string;
                    createdAt?: string;
                    updatedAt?: string;
                    archived?: boolean;
                    properties?: Record<string, unknown>;
                  }>;
                }
              )?.results ?? [];
            const notesResults = rawResults.map((note) => ({
              id: note.id,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt,
              archived: note.archived,
              body: (note.properties?.hs_note_body as string) ?? '',
            }));
            return { ...record, notes: notesResults };
          } catch {
            // Return ticket without notes if associations or notes API fails (e.g. missing scope)
          }
        }

        return input.objectType === 'tickets' ? { ...record, notes: record.notes ?? [] } : record;
      },
    },

    listOwners: {
      isTool: true,
      description:
        'List HubSpot owners (CRM users). Use to resolve names or emails to hubspot_owner_id for deal ' +
        'filters.',
      input: ListOwnersInputSchema,
      handler: async (ctx, input: ListOwnersInput) => {
        const params: Record<string, unknown> = {
          limit: input.limit ?? 20,
        };
        if (input.after) {
          params.after = input.after;
        }

        const response = await ctx.client.get(`${HUBSPOT_API_BASE}/crm/v3/owners`, { params });
        return response.data;
      },
    },

    searchDeals: {
      isTool: true,
      description:
        'Search deals with optional keyword, owner, pipeline, and stage. Discover IDs via listPipelines ' +
        'and listOwners before filtering.',
      input: SearchDealsInputSchema,
      handler: async (ctx, input: SearchDealsInput) => {
        const body: Record<string, unknown> = {
          limit: input.limit ?? 10,
        };

        if (input.query) {
          body.query = input.query;
        }

        const filters: Array<Record<string, string>> = [];
        if (input.pipeline) {
          filters.push({ propertyName: 'pipeline', operator: 'EQ', value: input.pipeline });
        }
        if (input.dealStage) {
          filters.push({ propertyName: 'dealstage', operator: 'EQ', value: input.dealStage });
        }
        if (input.ownerId) {
          filters.push({ propertyName: 'hubspot_owner_id', operator: 'EQ', value: input.ownerId });
        }
        if (filters.length > 0) {
          body.filterGroups = [{ filters }];
        }

        if (input.after) {
          body.after = input.after;
        }

        const response = await ctx.client.post(
          `${HUBSPOT_API_BASE}/crm/v3/objects/deals/search`,
          body
        );
        return response.data;
      },
    },

    searchBroad: {
      isTool: true,
      description:
        'Run one keyword search across contacts, companies, deals, and tickets in parallel (per-type limit, ' +
        'default 5).',
      input: SearchBroadInputSchema,
      handler: async (ctx, input: SearchBroadInput) => {
        const limit = input.limit ?? 5;
        const objectTypes = ['contacts', 'companies', 'deals', 'tickets'] as const;
        const results = await Promise.all(
          objectTypes.map(async (objectType) => {
            const response = await ctx.client.post(
              `${HUBSPOT_API_BASE}/crm/v3/objects/${objectType}/search`,
              { query: input.query, limit }
            );
            return { objectType, results: response.data?.results ?? [] };
          })
        );
        return Object.fromEntries(results.map(({ objectType, results: r }) => [objectType, r]));
      },
    },

    listPipelines: {
      isTool: true,
      description:
        'List HubSpot pipelines and stages for deals or tickets. Use returned pipeline and stage IDs with ' +
        'searchDeals.',
      input: ListPipelinesInputSchema,
      handler: async (ctx, input: ListPipelinesInput) => {
        const objectType = input.objectType ?? 'deals';
        const response = await ctx.client.get(`${HUBSPOT_API_BASE}/crm/v3/pipelines/${objectType}`);
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.hubspot.test.description', {
      defaultMessage: 'Verifies HubSpot connection by fetching contacts',
    }),
    handler: async (ctx) => {
      try {
        const response = await ctx.client.get(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, {
          params: { limit: 1 },
          validateStatus: () => true,
        });
        if (response.status === 200 || response.status === 204) {
          return { ok: true, message: 'Successfully connected to HubSpot API' };
        }
        return {
          ok: false,
          message:
            `HubSpot API returned status ${response.status}. Check that your Service Key or Private App ` +
            `token is valid and has the crm.objects.contacts.read scope.`,
        };
      } catch (error) {
        const err = error as { message?: string };
        return { ok: false, message: err.message ?? 'Unknown error connecting to HubSpot' };
      }
    },
  },

  skill: [
    '## HubSpot connector — LLM usage guide',
    '',
    '### Single type vs all types',
    'Use `searchCrmObjects` when the object type is known. Omit `query` there to page through records of ' +
      'that type.',
    'Engagements are normal CRM object types here: set `objectType` to calls, emails, meetings, notes, or tasks.',
    'Use `searchBroad` when the same keyword should hit contacts, companies, deals, and tickets at once; ' +
      'the response is keyed by object type.',
    '',
    '### Deal filters depend on portal-specific IDs',
    'Call `listPipelines` before supplying `pipeline` or `dealStage` to `searchDeals`, and `listOwners` to ' +
      'turn a name or email into `ownerId` (hubspot_owner_id).',
    '',
    '### Contacts with related deals',
    'Only when `objectType` is `contacts` and `includeAssociatedDeals` is true does `searchCrmObjects` ' +
      'return `{ contacts, associated_deals }` instead of the normal search/list body.',
    '',
    '### Tickets include notes when allowed',
    '`getCrmObject` for `tickets` adds an array of note bodies when association and note read scopes ' +
      'succeed; otherwise notes may be empty.',
  ].join('\n'),
};
