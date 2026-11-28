/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Microsoft Entra ID connector: identity lookups and account containment through Microsoft Graph.
 * https://learn.microsoft.com/en-us/graph/api/resources/users
 *
 * Request plumbing lives in graph_client.ts; the actions are grouped by area in *_actions.ts.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec_ui';
import { appActions, testConnection } from './app_actions';
import { authMethodActions } from './auth_method_actions';
import {
  DEFAULT_GRAPH_BASE_URL,
  GRAPH_DEFAULT_SCOPE,
  MICROSOFT_ENTRA_ID_CONNECTOR_TYPE_ID,
  TOKEN_URL_PLACEHOLDER,
  USE_BETA_VALUES,
} from './constants';
import { GRAPH_BASE_URL_RULE, isAllowedGraphBaseUrl } from './graph_client';
import { groupActions } from './group_actions';
import { riskActions } from './risk_actions';
import { userActions } from './user_actions';

const TOKEN_URL_META = {
  label: i18n.translate('connectorSpecs.microsoftEntraId.auth.tokenUrl.label', {
    defaultMessage: 'Token URL',
  }),
  placeholder: TOKEN_URL_PLACEHOLDER,
  helpText: i18n.translate('connectorSpecs.microsoftEntraId.auth.tokenUrl.helpText', {
    defaultMessage:
      "Replace '{tenant-id}' with your Microsoft Entra tenant ID, for example https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token. National clouds use their own sign-in host, for example login.microsoftonline.us.",
  }),
};

// No default for the scope: a default on a visible auth field replaces the saved value when the
// connector is edited, which would reset a national-cloud scope to the global one.
const SCOPE_META = {
  label: i18n.translate('connectorSpecs.microsoftEntraId.auth.scope.label', {
    defaultMessage: 'Scope',
  }),
  placeholder: GRAPH_DEFAULT_SCOPE,
  helpText: i18n.translate('connectorSpecs.microsoftEntraId.auth.scope.helpText', {
    defaultMessage:
      'Enter https://graph.microsoft.com/.default for the global service. For a national cloud enter the .default scope of its Graph host, for example https://graph.microsoft.us/.default.',
  }),
};

// The application permissions each action needs. Keep in sync with the docs page.
const CLIENT_ID_META = {
  helpText: i18n.translate('connectorSpecs.microsoftEntraId.auth.clientId.helpText', {
    defaultMessage:
      'Grant application permissions with admin consent. Read actions: User.Read.All, Group.Read.All, GroupMember.Read.All, Directory.Read.All, UserAuthenticationMethod.Read.All and IdentityRiskyUser.Read.All. Actions that change the directory: User.EnableDisableAccount.All, User.RevokeSessions.All, User-PasswordProfile.ReadWrite.All, UserAuthenticationMethod.ReadWrite.All, GroupMember.ReadWrite.All, IdentityRiskyUser.ReadWrite.All, AppRoleAssignment.ReadWrite.All and User.ReadWrite.All.',
  }),
};

export const MicrosoftEntraId: ConnectorSpec = {
  metadata: {
    id: MICROSOFT_ENTRA_ID_CONNECTOR_TYPE_ID,
    displayName: 'Microsoft Entra ID',
    description: i18n.translate('connectorSpecs.microsoftEntraId.metadata.description', {
      defaultMessage:
        'Look up Microsoft Entra ID users, groups, sign-in methods and Identity Protection risk to investigate accounts',
    }),
    // New third party connectors default to an enterprise license by policy. The floor
    // the actions plugin enforces is gold; raise this only, never lower it below gold.
    minimumLicense: 'enterprise',
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. Further feature ids follow in a separate PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        isRecommended: true,
        defaults: {},
        overrides: {
          meta: {
            tokenUrl: TOKEN_URL_META,
            clientId: CLIENT_ID_META,
            scope: SCOPE_META,
          },
        },
      },
      {
        type: 'oauth_client_credentials_private_key_jwt',
        defaults: {
          algorithm: 'PS256',
          certificateBinding: 'x5t#S256',
        },
        overrides: {
          meta: {
            tokenUrl: TOKEN_URL_META,
            clientId: CLIENT_ID_META,
            scope: SCOPE_META,
            algorithm: { hidden: true },
            certificateBinding: { hidden: true },
            keyId: { hidden: true },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      graphBaseUrl: UISchemas.url(DEFAULT_GRAPH_BASE_URL)
        .refine(isAllowedGraphBaseUrl, { message: GRAPH_BASE_URL_RULE })
        .default(DEFAULT_GRAPH_BASE_URL)
        .describe('Microsoft Graph host every action calls')
        .meta({
          label: i18n.translate('connectorSpecs.microsoftEntraId.config.graphBaseUrl.label', {
            defaultMessage: 'Microsoft Graph URL',
          }),
          placeholder: DEFAULT_GRAPH_BASE_URL,
          helpText: i18n.translate('connectorSpecs.microsoftEntraId.config.graphBaseUrl.helpText', {
            defaultMessage:
              'Keep https://graph.microsoft.com for the global service. National clouds: https://graph.microsoft.us (US Government L4), https://dod-graph.microsoft.us (US Government L5) or https://microsoftgraph.chinacloudapi.cn (China). Must be https with no path.',
          }),
        }),
      useBeta: z
        .enum(USE_BETA_VALUES)
        .default('false')
        .describe('Whether the request action calls the Microsoft Graph beta endpoint')
        .meta({
          widget: 'select',
          label: i18n.translate('connectorSpecs.microsoftEntraId.config.useBeta.label', {
            defaultMessage: 'Use the Graph beta endpoint for raw requests',
          }),
          helpText: i18n.translate('connectorSpecs.microsoftEntraId.config.useBeta.helpText', {
            defaultMessage:
              'Choose true to send the request action to the Microsoft Graph beta endpoint instead of v1.0. Every other action always calls v1.0. Microsoft can change beta APIs without notice.',
          }),
        }),
    })
  ),

  validateUrls: { fields: ['graphBaseUrl'] },

  actions: {
    ...userActions,
    ...authMethodActions,
    ...groupActions,
    ...riskActions,
    ...appActions,
  },

  skill: [
    '## Microsoft Entra ID',
    '',
    'Investigate accounts in Microsoft Entra ID (formerly Azure Active Directory).',
    '',
    '### Patterns',
    "- Resolve a person first: call `getUser` with the object id, userPrincipalName or email from the alert, and pass its `id` to the other actions. When `found` is false, try `listUsers` with a filter such as `startsWith(displayName,'Jane')`.",
    '- Size the blast radius: `getUserGroups` (nested groups and directory roles), `listUserAppRoleAssignments` (applications) and `getUserAuthMethods` (sign-in methods; one registered just before the alert is suspicious).',
    "- Check risk: `listRiskyUsers` with filter `id eq 'user-object-id'` or `riskLevel eq 'high'`. It needs Microsoft Entra ID P2; an access-denied error usually means the licence or the IdentityRiskyUser.Read.All permission is missing.",
    "- Members of a sensitive group: `listGroups` with filter `displayName eq 'name'`, then `listGroupMembers` with its id.",
    '',
    '### Gotchas',
    '- Lists return one page and `nextLink`. Pass `nextLink` back to the same action for the next page; another action refuses it.',
    '- `listUsers` and `listGroups`: endsWith, ne and not filters need `advancedQuery: true`. `search` takes "property:text" with the double quotes, for example "displayName:smith".',
    '- `getUser` returns signInSessionsValidFromDateTime: the last time the sessions of the user were revoked.',
  ].join('\n'),

  test: {
    // enabled must be explicitly set to true, otherwise the "Test connector"
    // button stays disabled in the UI even though a handler is defined.
    enabled: true,
    description:
      'Requests a token and reads one user id, which needs the User.Read.All permission.',
    handler: testConnection,
  },
};
