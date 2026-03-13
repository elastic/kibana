/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

export const HubSpotConnector: ConnectorSpec = {
  metadata: {
    id: '.hubspot',
    displayName: 'HubSpot',
    description: i18n.translate('core.kibanaConnectorSpecs.hubspot.metadata.description', {
      defaultMessage: 'Connect to HubSpot to search contacts, companies, deals, and tickets.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {
          token: '',
        },
        overrides: {
          meta: {
            token: {
              sensitive: true,
              label: i18n.translate('core.kibanaConnectorSpecs.hubspot.auth.token.label', {
                defaultMessage: 'Private App Access Token',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.hubspot.auth.token.helpText', {
                defaultMessage:
                  'Your HubSpot private app access token (starts with pat-). Create one in HubSpot Settings > Integrations > Private Apps.',
              }),
              placeholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            },
          },
        },
      },
    ],
  },

  // No additional configuration fields needed — the private app token covers auth
  schema: z.object({}),

  actions: {
    searchCrmObjects: {
      isTool: false,
      input: z.object({
        objectType: z.enum(['contacts', 'companies', 'deals', 'tickets']),
        query: z.string().optional(),
        properties: z.array(z.string()).optional(),
        limit: z.number().optional(),
        after: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          objectType: 'contacts' | 'companies' | 'deals' | 'tickets';
          query?: string;
          properties?: string[];
          limit?: number;
          after?: string;
        };

        if (typedInput.query) {
          // Use the CRM search API when a query is provided
          const body: Record<string, unknown> = {
            query: typedInput.query,
            limit: typedInput.limit ?? 10,
          };
          if (typedInput.properties && typedInput.properties.length > 0) {
            body.properties = typedInput.properties;
          }
          if (typedInput.after) {
            body.after = typedInput.after;
          }
          const response = await ctx.client.post(
            `${HUBSPOT_API_BASE}/crm/v3/objects/${typedInput.objectType}/search`,
            body
          );
          return response.data;
        } else {
          // Use the list API when no query is provided
          const params: Record<string, unknown> = {
            limit: typedInput.limit ?? 10,
          };
          if (typedInput.properties && typedInput.properties.length > 0) {
            params.properties = typedInput.properties.join(',');
          }
          if (typedInput.after) {
            params.after = typedInput.after;
          }
          const response = await ctx.client.get(
            `${HUBSPOT_API_BASE}/crm/v3/objects/${typedInput.objectType}`,
            { params }
          );
          return response.data;
        }
      },
    },

    getCrmObject: {
      isTool: false,
      input: z.object({
        objectType: z.enum(['contacts', 'companies', 'deals', 'tickets']),
        objectId: z.string(),
        properties: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          objectType: 'contacts' | 'companies' | 'deals' | 'tickets';
          objectId: string;
          properties?: string;
        };

        const params: Record<string, unknown> = {};
        if (typedInput.properties && typedInput.properties.length > 0) {
          params.properties = typedInput.properties;
        }

        const response = await ctx.client.get(
          `${HUBSPOT_API_BASE}/crm/v3/objects/${typedInput.objectType}/${typedInput.objectId}`,
          { params }
        );
        return response.data;
      },
    },

    searchEngagements: {
      isTool: false,
      input: z.object({
        query: z.string().optional(),
        engagementType: z
          .enum(['calls', 'emails', 'meetings', 'notes', 'tasks'])
          .optional(),
        limit: z.number().optional(),
        after: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query?: string;
          engagementType?: 'calls' | 'emails' | 'meetings' | 'notes' | 'tasks';
          limit?: number;
          after?: string;
        };

        const objectType = typedInput.engagementType ?? 'notes';

        if (typedInput.query) {
          const body: Record<string, unknown> = {
            query: typedInput.query,
            limit: typedInput.limit ?? 10,
          };
          if (typedInput.after) {
            body.after = typedInput.after;
          }
          const response = await ctx.client.post(
            `${HUBSPOT_API_BASE}/crm/v3/objects/${objectType}/search`,
            body
          );
          return response.data;
        } else {
          const params: Record<string, unknown> = {
            limit: typedInput.limit ?? 10,
          };
          if (typedInput.after) {
            params.after = typedInput.after;
          }
          const response = await ctx.client.get(
            `${HUBSPOT_API_BASE}/crm/v3/objects/${objectType}`,
            { params }
          );
          return response.data;
        }
      },
    },

    listOwners: {
      isTool: false,
      input: z.object({
        limit: z.number().optional(),
        after: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          limit?: number;
          after?: string;
        };

        const params: Record<string, unknown> = {
          limit: typedInput.limit ?? 20,
        };
        if (typedInput.after) {
          params.after = typedInput.after;
        }

        const response = await ctx.client.get(`${HUBSPOT_API_BASE}/crm/v3/owners`, { params });
        return response.data;
      },
    },

    searchDeals: {
      isTool: false,
      input: z.object({
        query: z.string().optional(),
        pipeline: z.string().optional(),
        dealStage: z.string().optional(),
        ownerId: z.string().optional(),
        limit: z.number().optional(),
        after: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query?: string;
          pipeline?: string;
          dealStage?: string;
          ownerId?: string;
          limit?: number;
          after?: string;
        };

        const body: Record<string, unknown> = {
          limit: typedInput.limit ?? 10,
        };

        if (typedInput.query) {
          body.query = typedInput.query;
        }

        const filterGroups: Array<{ filters: Array<Record<string, string>> }> = [];
        const filters: Array<Record<string, string>> = [];
        if (typedInput.pipeline) {
          filters.push({ propertyName: 'pipeline', operator: 'EQ', value: typedInput.pipeline });
        }
        if (typedInput.dealStage) {
          filters.push({ propertyName: 'dealstage', operator: 'EQ', value: typedInput.dealStage });
        }
        if (typedInput.ownerId) {
          filters.push({ propertyName: 'hubspot_owner_id', operator: 'EQ', value: typedInput.ownerId });
        }
        if (filters.length > 0) {
          filterGroups.push({ filters });
          body.filterGroups = filterGroups;
        }

        if (typedInput.after) {
          body.after = typedInput.after;
        }

        const response = await ctx.client.post(
          `${HUBSPOT_API_BASE}/crm/v3/objects/deals/search`,
          body
        );
        return response.data;
      },
    },

    searchAll: {
      isTool: false,
      input: z.object({
        query: z.string(),
        limit: z.number().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { query: string; limit?: number };
        const limit = typedInput.limit ?? 5;
        const objectTypes = ['contacts', 'companies', 'deals', 'tickets'] as const;

        const results = await Promise.all(
          objectTypes.map(async (objectType) => {
            const body = { query: typedInput.query, limit };
            const response = await ctx.client.post(
              `${HUBSPOT_API_BASE}/crm/v3/objects/${objectType}/search`,
              body
            );
            return { objectType, results: response.data?.results ?? [] };
          })
        );

        return Object.fromEntries(results.map(({ objectType, results: r }) => [objectType, r]));
      },
    },

    searchAndConnect: {
      isTool: false,
      input: z.object({
        query: z.string(),
        limit: z.number().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { query: string; limit?: number };
        const limit = typedInput.limit ?? 5;

        // Step 1: search contacts
        const searchResponse = await ctx.client.post(
          `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
          { query: typedInput.query, limit }
        );
        const contacts: Array<{ id: string; properties: Record<string, unknown> }> =
          searchResponse.data?.results ?? [];

        if (contacts.length === 0) {
          return { contacts: [], associated_deals: [] };
        }

        // Step 2: fetch deals associated with those contacts
        const contactIds = contacts.map((c) => c.id);
        const assocResponse = await ctx.client.post(
          `${HUBSPOT_API_BASE}/crm/v3/associations/contacts/deals/batch/read`,
          { inputs: contactIds.map((id) => ({ id })) }
        );

        return {
          contacts,
          associated_deals: assocResponse.data?.results ?? [],
        };
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.hubspot.test.description', {
      defaultMessage: 'Verifies HubSpot connection by fetching current user account details',
    }),
    handler: async (ctx) => {
      ctx.log.debug('HubSpot test handler');
      try {
        const response = await ctx.client.get(`${HUBSPOT_API_BASE}/oauth/v1/access-tokens/`, {
          validateStatus: () => true,
        });
        // A 200 or 401 both confirm that the API is reachable
        if (response.status === 200) {
          return { ok: true, message: 'Successfully connected to HubSpot API' };
        }
        // Try a second endpoint — the account info endpoint works with private app tokens
        const accountResponse = await ctx.client.get(
          `${HUBSPOT_API_BASE}/account-info/v3/api-usage/daily`
        );
        if (accountResponse.status === 200) {
          return { ok: true, message: 'Successfully connected to HubSpot API' };
        }
        return { ok: false, message: 'Failed to connect to HubSpot API' };
      } catch (error) {
        const err = error as { message?: string };
        return { ok: false, message: err.message ?? 'Unknown error connecting to HubSpot' };
      }
    },
  },
};
