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
import type { ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec_ui';
import {
  COMMERCIAL_SCOPE,
  DEFAULT_CLOUD,
  API_URL_QUERY_MESSAGE,
  INSECURE_API_URL_MESSAGE,
  INSECURE_TOKEN_URL_MESSAGE,
  isBaseApiUrl,
  isSecureUrl,
  MDE_CLOUD_IDS,
} from './client';

const TOKEN_URL_PLACEHOLDER = 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token';

/**
 * The inherited token URL schema accepts http, and the cloud check compares hostnames only, so
 * both auth types require https here: the token request carries the client secret or assertion.
 */
const secureTokenUrl = () => z.url().refine(isSecureUrl, INSECURE_TOKEN_URL_MESSAGE);

const scopeMeta = () => ({
  label: i18n.translate('connectorSpecs.microsoftDefenderForEndpoint.auth.scope.label', {
    defaultMessage: 'Scope',
  }),
  placeholder: COMMERCIAL_SCOPE,
  helpText: i18n.translate('connectorSpecs.microsoftDefenderForEndpoint.auth.scope.helpText', {
    defaultMessage:
      'The token audience of your Defender cloud: https://api.securitycenter.microsoft.com/.default for the commercial cloud and its regions, https://api-gcc.securitycenter.microsoft.us/.default for GCC, https://api-gov.securitycenter.microsoft.us/.default for GCC High and DoD.',
  }),
});

/**
 * App-only auth: a client secret or a certificate. The scope has no default because it depends on
 * the Defender cloud, and a default on a visible secret field overwrites the stored value on edit.
 */
export const mdeAuth: NonNullable<ConnectorSpec['auth']> = {
  types: [
    {
      type: 'oauth_client_credentials',
      isRecommended: true,
      // No default for scope: it depends on the Defender cloud, and a default on a visible
      // secret field would overwrite the stored value when the connector is edited.
      defaults: { tokenEndpointAuthMethod: 'client_secret_post' },
      overrides: {
        fields: {
          tokenUrl: secureTokenUrl(),
          scope: lazySchema(() => z.string().trim().min(1)),
        },
        meta: {
          tokenUrl: {
            placeholder: TOKEN_URL_PLACEHOLDER,
            helpText: i18n.translate(
              'connectorSpecs.microsoftDefenderForEndpoint.auth.tokenUrl.helpText',
              {
                defaultMessage:
                  "Replace '{tenant-id}' with your Microsoft Entra tenant ID. Use login.microsoftonline.us instead of login.microsoftonline.com for GCC High and DoD. Grant the app registration these WindowsDefenderATP application permissions, with admin consent: Machine.Read.All, Machine.ReadWrite.All, Machine.Isolate, Machine.Scan, Machine.CollectForensics, Machine.LiveResponse, Machine.StopAndQuarantine, Machine.RestrictExecution, Library.Manage, File.Read.All, Ip.Read.All, URL.Read.All, User.Read.All, Vulnerability.Read.All, and Ti.ReadWrite.All. Leave out the ones for actions you do not use.",
              }
            ),
          },
          clientId: {
            helpText: i18n.translate(
              'connectorSpecs.microsoftDefenderForEndpoint.auth.clientId.helpText',
              {
                defaultMessage:
                  'The Application (client) ID of the Microsoft Entra app registration.',
              }
            ),
          },
          scope: scopeMeta(),
        },
      },
    },
    {
      type: 'oauth_client_credentials_private_key_jwt',
      // Microsoft Entra expects a PS256 client assertion bound to the certificate by x5t#S256.
      defaults: { algorithm: 'PS256', certificateBinding: 'x5t#S256' },
      overrides: {
        fields: {
          tokenUrl: secureTokenUrl(),
          scope: lazySchema(() => z.string().trim().min(1)),
        },
        meta: {
          algorithm: { hidden: true },
          certificateBinding: { hidden: true },
          keyId: { hidden: true },
          tokenUrl: {
            placeholder: TOKEN_URL_PLACEHOLDER,
            helpText: i18n.translate(
              'connectorSpecs.microsoftDefenderForEndpoint.auth.privateKeyJwt.tokenUrl.helpText',
              {
                defaultMessage:
                  "Replace '{tenant-id}' with your Microsoft Entra tenant ID. Use login.microsoftonline.us instead of login.microsoftonline.com for GCC High and DoD. Upload the certificate registered on the app registration and its private key. The app registration needs the same WindowsDefenderATP application permissions as with a client secret.",
              }
            ),
          },
          scope: scopeMeta(),
        },
      },
    },
  ],
};

/** Connector config: the Defender cloud (API host) and an optional custom API URL. */
export const MdeConfigSchema = lazySchema(() =>
  z.object({
    cloud: z
      .enum(MDE_CLOUD_IDS)
      .default(DEFAULT_CLOUD)
      .describe('Microsoft Defender cloud and region; sets the API host.')
      .meta({
        widget: 'select',
        label: i18n.translate('connectorSpecs.microsoftDefenderForEndpoint.config.cloud.label', {
          defaultMessage: 'Defender cloud',
        }),
        helpText: i18n.translate(
          'connectorSpecs.microsoftDefenderForEndpoint.config.cloud.helpText',
          {
            defaultMessage:
              'commercial uses api.security.microsoft.com; the commercial regions use their regional host, for example commercial-eu uses eu.api.security.microsoft.com; gcc uses api-gcc.securitycenter.microsoft.us; gcc-high and dod use api-gov.securitycenter.microsoft.us. The token URL and the scope must belong to the same cloud.',
          }
        ),
      }),
    apiUrl: UISchemas.url('https://api.security.microsoft.com/api')
      .max(2048)
      .refine(isSecureUrl, INSECURE_API_URL_MESSAGE)
      .refine(isBaseApiUrl, API_URL_QUERY_MESSAGE)
      .optional()
      .describe('Custom Defender for Endpoint API base URL, including /api')
      .meta({
        label: i18n.translate('connectorSpecs.microsoftDefenderForEndpoint.config.apiUrl.label', {
          defaultMessage: 'Custom API URL',
        }),
        helpText: i18n.translate(
          'connectorSpecs.microsoftDefenderForEndpoint.config.apiUrl.helpText',
          {
            defaultMessage:
              "Optional. Leave empty to use the Defender cloud's API host. Set it only to reach the API through a proxy; include /api, use https, and leave out any query string or fragment.",
          }
        ),
      }),
  })
);
