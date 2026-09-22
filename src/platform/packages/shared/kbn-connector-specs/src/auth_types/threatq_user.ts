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
import type { AuthTypeSpec } from '../connector_spec';

const authSchema = lazySchema(() =>
  z
    .object({
      tokenUrl: z
        .url()
        .max(2048)
        .refine((value) => {
          if (!URL.canParse(value)) return false;
          const url = new URL(value);
          return (
            url.protocol === 'https:' &&
            !url.username &&
            !url.password &&
            !url.search &&
            !url.hash &&
            url.pathname === '/api/token'
          );
        }, 'Enter the HTTPS ThreatQ token URL ending in /api/token.')
        .meta({
          label: i18n.translate('connectorAuth.threatq.tokenUrl.label', {
            defaultMessage: 'Token URL',
          }),
          helpText: i18n.translate('connectorAuth.threatq.tokenUrl.help', {
            defaultMessage: 'Your ThreatQ instance URL followed by /api/token.',
          }),
          validate: { allowedHosts: true },
        }),
      username: z
        .string()
        .min(1)
        .max(320)
        .meta({
          label: i18n.translate('connectorAuth.threatq.username.label', {
            defaultMessage: 'Email',
          }),
        }),
      password: z
        .string()
        .min(1)
        .max(4096)
        .meta({
          label: i18n.translate('connectorAuth.threatq.password.label', {
            defaultMessage: 'Password',
          }),
          sensitive: true,
        }),
      clientId: z
        .string()
        .min(1)
        .max(4096)
        .meta({
          label: i18n.translate('connectorAuth.threatq.clientId.label', {
            defaultMessage: 'API password (client_id)',
          }),
          helpText: i18n.translate('connectorAuth.threatq.clientId.help', {
            defaultMessage:
              'API password from an administrator user profile in ThreatQ. This is not an OAuth client ID.',
          }),
          sensitive: true,
        }),
    })
    .meta({
      label: i18n.translate('connectorAuth.threatq.label', {
        defaultMessage: 'ThreatQ user account',
      }),
    })
);

export type ThreatQUserSecrets = z.infer<typeof authSchema>;

export const ThreatQUserAuth: AuthTypeSpec<ThreatQUserSecrets> = {
  id: 'threatq_user',
  schema: authSchema,
  configure: async (_, client, { tokenUrl, username, password, clientId }) => {
    try {
      const { data } = await client.post<{ access_token?: string }>(
        tokenUrl,
        {
          email: username,
          password,
          client_id: clientId,
          grant_type: 'password',
        },
        { maxRedirects: 0, headers: { 'Content-Type': 'application/json' } }
      );
      if (typeof data.access_token !== 'string' || !data.access_token) {
        throw new Error('Missing access token');
      }
      client.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
      return client;
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      // Axios errors can include the account password and API password.
      throw new Error(
        `ThreatQ authentication failed${
          status ? ` (HTTP ${status})` : ''
        }. Check the account credentials and API password.`
      );
    }
  },
};
