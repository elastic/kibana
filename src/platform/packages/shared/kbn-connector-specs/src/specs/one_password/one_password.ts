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

const BASE_URL_DEFAULT = 'https://api.1password.com/v1beta1';

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
        defaults: { scope: 'openid' },
      },
    ],
    headers: {
      'User-Agent': 'ElasticKibana/9.4.0',
    },
  },
  schema: z.object({
    baseUrl: z
      .url()
      .default(BASE_URL_DEFAULT)
      .meta({
        label: i18n.translate('core.kibanaConnectorSpecs.onePassword.config.baseUrl', {
          defaultMessage: 'API Base URL',
        }),
      }),
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
  validateUrls: { fields: ['baseUrl'] },

  actions: {
    listUsers: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.onePassword.actions.listUsers.description',
        { defaultMessage: 'List users in the 1Password account, optionally filtered by status' }
      ),
      input: z.object({
        status: z.enum(['ACTIVE', 'SUSPENDED', 'STATUS_UNSPECIFIED']).optional(),
        maxPageSize: z.number().optional(),
        pageToken: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          status?: 'ACTIVE' | 'SUSPENDED' | 'STATUS_UNSPECIFIED';
          maxPageSize?: number;
          pageToken?: string;
        };
        const { baseUrl, accountUuid } = ctx.config as {
          baseUrl: string;
          accountUuid: string;
        };

        const response = await ctx.client.get(`${baseUrl}/users`, {
          params: {
            accountUuid,
            ...(typedInput.status && { status: typedInput.status }),
            ...(typedInput.maxPageSize && { max_page_size: typedInput.maxPageSize }),
            ...(typedInput.pageToken && { page_token: typedInput.pageToken }),
          },
        });

        return response.data;
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
        const { baseUrl, accountUuid } = ctx.config as {
          baseUrl: string;
          accountUuid: string;
        };

        const response = await ctx.client.get(`${baseUrl}/users/${uuid}`, {
          params: { accountUuid },
        });

        return response.data;
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
        const { baseUrl, accountUuid } = ctx.config as {
          baseUrl: string;
          accountUuid: string;
        };

        const response = await ctx.client.patch(`${baseUrl}/users/${uuid}/suspend`, null, {
          params: { accountUuid },
        });

        return response.data;
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
        const { baseUrl, accountUuid } = ctx.config as {
          baseUrl: string;
          accountUuid: string;
        };

        const response = await ctx.client.patch(`${baseUrl}/users/${uuid}/reactivate`, null, {
          params: { accountUuid },
        });

        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.onePassword.test.description', {
      defaultMessage: 'Verifies the 1Password connection by listing users',
    }),
    handler: async (ctx) => {
      ctx.log.debug('1Password test handler');
      const { baseUrl, accountUuid } = ctx.config as {
        baseUrl: string;
        accountUuid: string;
      };

      const response = await ctx.client.get(`${baseUrl}/users`, {
        params: { accountUuid, max_page_size: 1 },
      });

      if (response.status === 200) {
        return { ok: true, message: 'Successfully connected to 1Password Users API' };
      }

      return { ok: false, message: 'Failed to connect to 1Password Users API' };
    },
  },
};
