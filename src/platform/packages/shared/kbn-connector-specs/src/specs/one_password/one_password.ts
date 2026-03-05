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

const BASE_URL = 'https://api.1password.com/v1beta1';

// So we get something like: 1Password API error (403): {"code":7,"message":"no_owner_remain","details":[]}
const throwWithApiError = (error: unknown): never => {
  const axiosError = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };
  if (axiosError.response?.data) {
    const detail =
      typeof axiosError.response.data === 'string'
        ? axiosError.response.data
        : JSON.stringify(axiosError.response.data);
    throw new Error(`1Password API error (${axiosError.response.status}): ${detail}`);
  }
  throw error;
};

export const OnePasswordConnector: ConnectorSpec = {
  metadata: {
    id: '.one_password',
    displayName: '1Password',
    description: i18n.translate('core.kibanaConnectorSpecs.onePassword.metadata.description', {
      defaultMessage:
        'Manage users in 1Password Enterprise Password Manager — list, get, suspend, and reactivate users',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },
  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        defaults: {
          tokenUrl: `${BASE_URL}/users/oauth2/token`,
          scope: 'openid',
          tokenEndpointAuthMethod: 'client_secret_basic',
        },
        overrides: {
          meta: {
            tokenUrl: { hidden: true },
            scope: { hidden: true },
          },
        },
      },
    ],
    headers: {
      'User-Agent': 'ElasticKibana',
    },
  },
  schema: z.object({
    accountUuid: z
      .string()
      .min(1, {
        message: i18n.translate(
          'core.kibanaConnectorSpecs.onePassword.config.accountUuidRequired',
          { defaultMessage: 'Account UUID is required' }
        ),
      })
      .meta({
        label: i18n.translate('core.kibanaConnectorSpecs.onePassword.config.accountUuid', {
          defaultMessage: 'Account UUID',
        }),
      }),
  }),

  actions: {
    listUsers: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.onePassword.actions.listUsers.description',
        { defaultMessage: 'List users in the 1Password account, optionally filtered by state' }
      ),
      input: z.object({
        filter: z.enum(['user.isActive()', 'user.isSuspended()']).optional(),
        maxPageSize: z.number().optional(),
        pageToken: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          filter?: 'user.isActive()' | 'user.isSuspended()';
          maxPageSize?: number;
          pageToken?: string;
        };
        const { accountUuid } = ctx.config as { accountUuid: string };

        try {
          const response = await ctx.client.get(`${BASE_URL}/accounts/${accountUuid}/users`, {
            params: {
              ...(typedInput.filter && { filter: typedInput.filter }),
              ...(typedInput.maxPageSize && { maxPageSize: typedInput.maxPageSize }),
              ...(typedInput.pageToken && { pageToken: typedInput.pageToken }),
            },
          });
          return response.data;
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getUser: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.onePassword.actions.getUser.description',
        { defaultMessage: 'Get details for a single user by their UUID' }
      ),
      input: z.object({
        uuid: z.string().min(1),
      }),
      handler: async (ctx, input) => {
        const { uuid } = input as { uuid: string };
        const { accountUuid } = ctx.config as { accountUuid: string };

        try {
          const response = await ctx.client.get(
            `${BASE_URL}/accounts/${accountUuid}/users/${uuid}`
          );
          return response.data;
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    suspendUser: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.onePassword.actions.suspendUser.description',
        {
          defaultMessage:
            'Suspend an active user, preventing them from accessing the 1Password account',
        }
      ),
      input: z.object({
        uuid: z.string().min(1),
      }),
      handler: async (ctx, input) => {
        const { uuid } = input as { uuid: string };
        const { accountUuid } = ctx.config as { accountUuid: string };

        try {
          const response = await ctx.client.post(
            `${BASE_URL}/accounts/${accountUuid}/users/${uuid}:suspend`
          );
          return response.data;
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    reactivateUser: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.onePassword.actions.reactivateUser.description',
        { defaultMessage: 'Reactivate a suspended user, restoring their access to 1Password' }
      ),
      input: z.object({
        uuid: z.string().min(1),
      }),
      handler: async (ctx, input) => {
        const { uuid } = input as { uuid: string };
        const { accountUuid } = ctx.config as { accountUuid: string };

        try {
          const response = await ctx.client.post(
            `${BASE_URL}/accounts/${accountUuid}/users/${uuid}:reactivate`
          );
          return response.data;
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.onePassword.test.description', {
      defaultMessage: 'Verifies the 1Password connection by listing users',
    }),
    handler: async (ctx) => {
      ctx.log.debug('1Password test handler');
      const { accountUuid } = ctx.config as { accountUuid: string };

      try {
        const response = await ctx.client.get(`${BASE_URL}/accounts/${accountUuid}/users`, {
          params: { maxPageSize: 1 },
        });

        if (response.status === 200) {
          return { ok: true, message: 'Successfully connected to 1Password Users API' };
        }

        return { ok: false, message: 'Failed to connect to 1Password Users API' };
      } catch (error) {
        return throwWithApiError(error);
      }
    },
  },
};
