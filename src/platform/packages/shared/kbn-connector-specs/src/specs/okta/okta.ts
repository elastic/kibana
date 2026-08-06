/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Okta Connector
 *
 * Identity-response actions against the Okta Management API for SOC workflows:
 * resolve a user from an alert, contain (suspend / revoke sessions / reset MFA),
 * reverse false positives, and enrich with groups and System Log events.
 *
 * Auth (recommended): OAuth 2.0 service app with private_key_jwt (RS256 + kid).
 * Fallback: SSWS API token for orgs not yet on OAuth for Okta.
 *
 * https://developer.okta.com/docs/api/
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec';
import {
  ActivateUserInputSchema,
  AddUserToGroupInputSchema,
  ClearUserSessionsInputSchema,
  DeactivateUserInputSchema,
  ExpirePasswordInputSchema,
  GetLogsInputSchema,
  GetUserFactorsInputSchema,
  GetUserGroupsInputSchema,
  GetUserInputSchema,
  ListUsersInputSchema,
  RemoveUserFromGroupInputSchema,
  ResetFactorsInputSchema,
  ResetPasswordInputSchema,
  SearchUsersInputSchema,
  SuspendUserInputSchema,
  UnsuspendUserInputSchema,
} from './types';
import type {
  ActivateUserInput,
  AddUserToGroupInput,
  ClearUserSessionsInput,
  DeactivateUserInput,
  ExpirePasswordInput,
  GetLogsInput,
  GetUserFactorsInput,
  GetUserGroupsInput,
  GetUserInput,
  ListUsersInput,
  RemoveUserFromGroupInput,
  ResetFactorsInput,
  ResetPasswordInput,
  SearchUsersInput,
  SuspendUserInput,
  UnsuspendUserInput,
} from './types';

/** Scopes required for Must + Should actions - keep in sync with auth helpText and docs. */
const OKTA_OAUTH_SCOPES = ['okta.users.manage', 'okta.groups.manage', 'okta.logs.read'].join(' ');

interface OktaConfig {
  orgUrl?: string;
}

const getOrgUrl = (ctx: ActionContext): string => {
  const orgUrl = ((ctx.config as OktaConfig | undefined)?.orgUrl ?? '').trim();
  if (!orgUrl) {
    throw new Error('Okta connector is missing the required Org URL configuration field.');
  }
  return orgUrl.replace(/\/+$/, '');
};

/**
 * Okta SSWS tokens must be sent as `Authorization: SSWS <token>`.
 * Store under `apiToken` so the framework does not set a bare Authorization
 * default; handlers attach the correctly prefixed header (Dynatrace pattern).
 */
const buildSswsAuthHeader = (rawToken: string): string => {
  const trimmed = rawToken.trim();
  if (/^SSWS\s+\S+/i.test(trimmed)) {
    return trimmed;
  }
  return `SSWS ${trimmed}`;
};

const getSswsAuthHeaders = (ctx: ActionContext): { Authorization: string } | undefined => {
  const secrets = ctx.secrets as Record<string, unknown> | undefined;
  if (secrets?.authType !== 'api_key_header') {
    return undefined;
  }
  const raw =
    (typeof secrets.apiToken === 'string' && secrets.apiToken) ||
    (typeof secrets.Authorization === 'string' && secrets.Authorization) ||
    '';
  if (!raw.trim()) {
    throw new Error('Okta connector is missing the SSWS API token.');
  }
  return { Authorization: buildSswsAuthHeader(raw) };
};

const withOktaRequestConfig = (
  ctx: ActionContext,
  config: AxiosRequestConfig = {}
): AxiosRequestConfig => {
  const sswsHeaders = getSswsAuthHeaders(ctx);
  if (!sswsHeaders) {
    return config;
  }
  return {
    ...config,
    headers: {
      ...config.headers,
      ...sswsHeaders,
    },
  };
};

const formatOktaError = (action: string, error: unknown): Error => {
  const err = error as AxiosError<{
    errorSummary?: string;
    errorCode?: string;
    errorId?: string;
    errorCauses?: Array<{ errorSummary?: string }>;
  }>;
  if (err.response?.data) {
    const data = err.response.data;
    const causes =
      data.errorCauses
        ?.map((c) => c.errorSummary)
        .filter(Boolean)
        .join('; ') ?? '';
    const summary = data.errorSummary ?? JSON.stringify(data);
    const code = data.errorCode ? ` [${data.errorCode}]` : '';
    const id = data.errorId ? ` (errorId: ${data.errorId})` : '';
    const causesSuffix = causes ? ` - ${causes}` : '';
    return new Error(
      `Okta ${action} failed (status ${err.response.status})${code}: ${summary}${causesSuffix}${id}`
    );
  }
  return new Error(
    `Okta ${action} request failed (status ${err.response?.status ?? 'unknown'}): ${
      err.message ?? 'unknown error'
    }`
  );
};

const userPath = (orgUrl: string, userId: string): string =>
  `${orgUrl}/api/v1/users/${encodeURIComponent(userId)}`;

const groupUserPath = (orgUrl: string, groupId: string, userId: string): string =>
  `${orgUrl}/api/v1/groups/${encodeURIComponent(groupId)}/users/${encodeURIComponent(userId)}`;

const parseLinkHeader = (linkHeader: unknown): string | undefined => {
  if (typeof linkHeader !== 'string' || !linkHeader) {
    return undefined;
  }
  return linkHeader;
};

export const Okta: ConnectorSpec = {
  metadata: {
    id: '.okta',
    displayName: 'Okta',
    description: i18n.translate('core.kibanaConnectorSpecs.okta.metadata.description', {
      defaultMessage:
        'Contain compromised Okta identities - suspend users, revoke sessions, reset MFA, manage group membership, and query System Log events',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder', 'workflows'],
    docsUrl: 'https://www.elastic.co/docs/reference/kibana/connectors-kibana/okta-action-type',
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials_private_key_jwt',
        isRecommended: true,
        defaults: {
          algorithm: 'RS256',
          certificateBinding: 'kid',
          scope: OKTA_OAUTH_SCOPES,
        },
        overrides: {
          meta: {
            scope: { hidden: true },
            algorithm: { hidden: true },
            certificateBinding: { hidden: true },
            certificate: { hidden: true },
            tokenUrl: {
              label: i18n.translate('core.kibanaConnectorSpecs.okta.auth.oauth.tokenUrl.label', {
                defaultMessage: 'Token URL',
              }),
              placeholder: 'https://your-okta-domain.okta.com/oauth2/v1/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.okta.auth.oauth.tokenUrl.helpText',
                {
                  defaultMessage:
                    'Org Authorization Server token endpoint. Must match your Org URL, for example https://your-okta-domain.okta.com/oauth2/v1/token. Create an API Services app with Public key/Private key client authentication, grant scopes okta.users.manage okta.groups.manage okta.logs.read, assign an admin role, and disable Require Demonstrating Proof of Possession (DPoP) on the app - Kibana does not send DPoP proofs yet.',
                }
              ),
            },
            clientId: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.okta.auth.oauth.clientId.helpText',
                {
                  defaultMessage: 'Client ID of the Okta API Services (service) app integration.',
                }
              ),
            },
            keyId: {
              label: i18n.translate('core.kibanaConnectorSpecs.okta.auth.oauth.keyId.label', {
                defaultMessage: 'Key ID (kid)',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.okta.auth.oauth.keyId.helpText', {
                defaultMessage:
                  'kid of the public key registered on the service app JWKS. Required for Okta private_key_jwt.',
              }),
            },
            privateKey: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.okta.auth.oauth.privateKey.helpText',
                {
                  defaultMessage:
                    'PEM-encoded private key that matches the public key on the service app. Must begin with -----BEGIN PRIVATE KEY----- or -----BEGIN RSA PRIVATE KEY-----.',
                }
              ),
            },
            passphrase: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.okta.auth.oauth.passphrase.helpText',
                {
                  defaultMessage:
                    'Only required if the private key is encrypted (ENCRYPTED PRIVATE KEY).',
                }
              ),
            },
          },
        },
      },
      {
        type: 'api_key_header',
        defaults: { headerField: 'apiToken' },
        overrides: {
          meta: {
            apiToken: {
              label: i18n.translate('core.kibanaConnectorSpecs.okta.auth.ssws.apiToken.label', {
                defaultMessage: 'API token (SSWS)',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.okta.auth.ssws.apiToken.helpText',
                {
                  defaultMessage:
                    'Paste the raw Okta API token from Security > API > Tokens. Do not include a prefix - the connector sends Authorization: SSWS automatically. Prefer the OAuth service-app auth type when possible. Token privileges must allow user lifecycle, sessions, groups, and System Log read (equivalent to okta.users.manage, okta.groups.manage, okta.logs.read).',
                }
              ),
              placeholder: '00…',
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      orgUrl: UISchemas.url('https://your-okta-domain.okta.com')
        .describe('Okta organization URL')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.okta.config.orgUrl.label', {
            defaultMessage: 'Org URL',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.okta.config.orgUrl.helpText', {
            defaultMessage:
              'Base URL of your Okta org, for example https://your-okta-domain.okta.com or https://your-okta-domain.oktapreview.com. Custom domains are supported. Do not include /api/v1.',
          }),
        }),
    })
  ),

  actions: {
    getUser: {
      isTool: true,
      description:
        'Resolve a full Okta user record by id, login, or email. Use this first when an alert only has a login or email so write actions can use the canonical user id. Returns profile, status, and credentials metadata.',
      input: GetUserInputSchema,
      handler: async (ctx, input: GetUserInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.get(
            userPath(orgUrl, input.userId),
            withOktaRequestConfig(ctx)
          );
          return response.data;
        } catch (error) {
          throw formatOktaError('getUser', error);
        }
      },
    },

    getUserGroups: {
      isTool: true,
      description:
        'List group memberships for a user. Use for enrichment and to decide whether to add the user to a quarantine group or remove them from a privileged group.',
      input: GetUserGroupsInputSchema,
      handler: async (ctx, input: GetUserGroupsInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.get(
            `${userPath(orgUrl, input.userId)}/groups`,
            withOktaRequestConfig(ctx)
          );
          return { groups: response.data };
        } catch (error) {
          throw formatOktaError('getUserGroups', error);
        }
      },
    },

    suspendUser: {
      isTool: true,
      description:
        'Suspend an ACTIVE user so they cannot sign in while preserving the account for investigation. Prefer this for reversible containment; use deactivateUser only for confirmed-malicious accounts. Okta also clears sessions on suspend.',
      input: SuspendUserInputSchema,
      handler: async (ctx, input: SuspendUserInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${userPath(orgUrl, input.userId)}/lifecycle/suspend`,
            null,
            withOktaRequestConfig(ctx)
          );
          return response.data ?? { status: 'SUSPENDED' };
        } catch (error) {
          throw formatOktaError('suspendUser', error);
        }
      },
    },

    unsuspendUser: {
      isTool: true,
      description:
        'Lift a suspend (SUSPENDED → ACTIVE) after a false positive. Use only on users previously suspended with suspendUser.',
      input: UnsuspendUserInputSchema,
      handler: async (ctx, input: UnsuspendUserInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${userPath(orgUrl, input.userId)}/lifecycle/unsuspend`,
            null,
            withOktaRequestConfig(ctx)
          );
          return response.data ?? { status: 'ACTIVE' };
        } catch (error) {
          throw formatOktaError('unsuspendUser', error);
        }
      },
    },

    deactivateUser: {
      isTool: true,
      description:
        'Deactivate a user (DEPROVISIONED) as a full lifecycle containment step beyond suspend. Destructive relative to suspend - prefer suspendUser when investigation may reverse the decision.',
      input: DeactivateUserInputSchema,
      handler: async (ctx, input: DeactivateUserInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${userPath(orgUrl, input.userId)}/lifecycle/deactivate`,
            null,
            withOktaRequestConfig(ctx, {
              params: {
                ...(input.sendEmail !== undefined ? { sendEmail: input.sendEmail } : {}),
              },
            })
          );
          return response.data ?? { status: 'DEPROVISIONED' };
        } catch (error) {
          throw formatOktaError('deactivateUser', error);
        }
      },
    },

    activateUser: {
      isTool: true,
      description:
        'Activate a STAGED or DEPROVISIONED user after investigation clears them. May return an activation token when sendEmail is false.',
      input: ActivateUserInputSchema,
      handler: async (ctx, input: ActivateUserInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${userPath(orgUrl, input.userId)}/lifecycle/activate`,
            null,
            withOktaRequestConfig(ctx, {
              params: {
                ...(input.sendEmail !== undefined ? { sendEmail: input.sendEmail } : {}),
              },
            })
          );
          return response.data ?? { ok: true };
        } catch (error) {
          throw formatOktaError('activateUser', error);
        }
      },
    },

    clearUserSessions: {
      isTool: true,
      description:
        'Revoke all active Okta IdP sessions for a user so they must re-authenticate. Optionally also revoke OAuth tokens and forget remembered devices. Does not clear sessions created for some web or native apps.',
      input: ClearUserSessionsInputSchema,
      handler: async (ctx, input: ClearUserSessionsInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          await ctx.client.delete(
            `${userPath(orgUrl, input.userId)}/sessions`,
            withOktaRequestConfig(ctx, {
              params: {
                ...(input.oauthTokens !== undefined ? { oauthTokens: input.oauthTokens } : {}),
                ...(input.forgetDevices !== undefined
                  ? { forgetDevices: input.forgetDevices }
                  : {}),
              },
            })
          );
          return { ok: true };
        } catch (error) {
          throw formatOktaError('clearUserSessions', error);
        }
      },
    },

    resetFactors: {
      isTool: true,
      description:
        'Un-enroll all MFA factors for a user (status stays ACTIVE). Use when a second factor is suspected lost or compromised. Confirm with getUserFactors first when possible.',
      input: ResetFactorsInputSchema,
      handler: async (ctx, input: ResetFactorsInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${userPath(orgUrl, input.userId)}/lifecycle/reset_factors`,
            null,
            withOktaRequestConfig(ctx)
          );
          return response.data ?? { ok: true };
        } catch (error) {
          throw formatOktaError('resetFactors', error);
        }
      },
    },

    getUserFactors: {
      isTool: true,
      description:
        'List enrolled MFA factors for a user so an author can decide whether resetFactors is warranted.',
      input: GetUserFactorsInputSchema,
      handler: async (ctx, input: GetUserFactorsInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.get(
            `${userPath(orgUrl, input.userId)}/factors`,
            withOktaRequestConfig(ctx)
          );
          return { factors: response.data };
        } catch (error) {
          throw formatOktaError('getUserFactors', error);
        }
      },
    },

    resetPassword: {
      isTool: true,
      description:
        'Start a password reset (user moves to RECOVERY). sendEmail is required: true emails the reset link; false returns resetPasswordUrl for a custom flow. Optionally revoke sessions.',
      input: ResetPasswordInputSchema,
      handler: async (ctx, input: ResetPasswordInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${userPath(orgUrl, input.userId)}/lifecycle/reset_password`,
            null,
            withOktaRequestConfig(ctx, {
              params: {
                sendEmail: input.sendEmail,
                ...(input.revokeSessions !== undefined
                  ? { revokeSessions: input.revokeSessions }
                  : {}),
              },
            })
          );
          return response.data ?? { ok: true };
        } catch (error) {
          throw formatOktaError('resetPassword', error);
        }
      },
    },

    expirePassword: {
      isTool: true,
      description:
        'Force the user to change their password at next sign-in (PASSWORD_EXPIRED). Set tempPassword true to also generate a temporary password via expire_password_with_temp_password.',
      input: ExpirePasswordInputSchema,
      handler: async (ctx, input: ExpirePasswordInput) => {
        const orgUrl = getOrgUrl(ctx);
        const path = input.tempPassword
          ? `${userPath(orgUrl, input.userId)}/lifecycle/expire_password_with_temp_password`
          : `${userPath(orgUrl, input.userId)}/lifecycle/expire_password`;
        try {
          const response = await ctx.client.post(path, null, withOktaRequestConfig(ctx));
          return response.data ?? { ok: true };
        } catch (error) {
          throw formatOktaError('expirePassword', error);
        }
      },
    },

    addUserToGroup: {
      isTool: true,
      description:
        'Add a user to a group (for example a quarantine group) as a remediation lever. Uses PUT and returns 204 on success.',
      input: AddUserToGroupInputSchema,
      handler: async (ctx, input: AddUserToGroupInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          await ctx.client.put(
            groupUserPath(orgUrl, input.groupId, input.userId),
            null,
            withOktaRequestConfig(ctx)
          );
          return { ok: true };
        } catch (error) {
          throw formatOktaError('addUserToGroup', error);
        }
      },
    },

    removeUserFromGroup: {
      isTool: true,
      description:
        'Remove a user from a group (for example strip a privileged group) as a remediation lever. Returns 204 on success.',
      input: RemoveUserFromGroupInputSchema,
      handler: async (ctx, input: RemoveUserFromGroupInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          await ctx.client.delete(
            groupUserPath(orgUrl, input.groupId, input.userId),
            withOktaRequestConfig(ctx)
          );
          return { ok: true };
        } catch (error) {
          throw formatOktaError('removeUserFromGroup', error);
        }
      },
    },

    listUsers: {
      isTool: true,
      description:
        'List users with pagination and optional sort. Use searchUsers when you have an email, login keyword, or attribute filter. Returns users plus the raw Link header for the next page when present.',
      input: ListUsersInputSchema,
      handler: async (ctx, input: ListUsersInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.get(
            `${orgUrl}/api/v1/users`,
            withOktaRequestConfig(ctx, {
              params: {
                ...(input.limit !== undefined ? { limit: input.limit } : {}),
                ...(input.after ? { after: input.after } : {}),
                ...(input.sortBy ? { sortBy: input.sortBy } : {}),
                ...(input.sortOrder ? { sortOrder: input.sortOrder } : {}),
              },
            })
          );
          return {
            users: response.data,
            link: parseLinkHeader(response.headers?.link ?? response.headers?.Link),
          };
        } catch (error) {
          throw formatOktaError('listUsers', error);
        }
      },
    },

    searchUsers: {
      isTool: true,
      description:
        'Find users by keyword (q), advanced search expression, or SCIM filter. Use to resolve identities in bulk from partial alert identifiers. Do not combine search and filter in one call.',
      input: SearchUsersInputSchema,
      handler: async (ctx, input: SearchUsersInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.get(
            `${orgUrl}/api/v1/users`,
            withOktaRequestConfig(ctx, {
              params: {
                ...(input.q ? { q: input.q } : {}),
                ...(input.search ? { search: input.search } : {}),
                ...(input.filter ? { filter: input.filter } : {}),
                ...(input.limit !== undefined ? { limit: input.limit } : {}),
                ...(input.after ? { after: input.after } : {}),
              },
            })
          );
          return {
            users: response.data,
            link: parseLinkHeader(response.headers?.link ?? response.headers?.Link),
          };
        } catch (error) {
          throw formatOktaError('searchUsers', error);
        }
      },
    },

    getLogs: {
      isTool: true,
      description:
        'Query Okta System Log events (failed logins, suspicious auth, admin actions). Filter with since/until, filter expressions, or keywords. Returns events plus Link header for pagination.',
      input: GetLogsInputSchema,
      handler: async (ctx, input: GetLogsInput) => {
        const orgUrl = getOrgUrl(ctx);
        try {
          const response = await ctx.client.get(
            `${orgUrl}/api/v1/logs`,
            withOktaRequestConfig(ctx, {
              params: {
                ...(input.since ? { since: input.since } : {}),
                ...(input.until ? { until: input.until } : {}),
                ...(input.filter ? { filter: input.filter } : {}),
                ...(input.q ? { q: input.q } : {}),
                ...(input.limit !== undefined ? { limit: input.limit } : {}),
                ...(input.sortOrder ? { sortOrder: input.sortOrder } : {}),
                ...(input.after ? { after: input.after } : {}),
              },
            })
          );
          return {
            events: response.data,
            link: parseLinkHeader(response.headers?.link ?? response.headers?.Link),
          };
        } catch (error) {
          throw formatOktaError('getLogs', error);
        }
      },
    },
  },

  skill: [
    '## Okta Connector',
    '',
    'Use this connector for identity containment and enrichment against an Okta org from Agent Builder or Workflows.',
    '',
    '### Containment playbook',
    '1. Resolve the identity: `getUser` (or `searchUsers` / `listUsers`) with the login/email/id from the alert.',
    '2. Enrich: `getUserGroups`, optionally `getUserFactors` and `getLogs` for auth history.',
    '3. Contain: `clearUserSessions` then `suspendUser`. Add to a quarantine group with `addUserToGroup` if your runbook requires it.',
    '4. If MFA is compromised: `resetFactors` (confirm with `getUserFactors` first).',
    '5. Confirmed malicious only: `deactivateUser` (stronger than suspend).',
    '6. False positive: `unsuspendUser` and/or `activateUser`, `removeUserFromGroup` from quarantine.',
    '',
    '### Credential remediation',
    '- `resetPassword` requires `sendEmail` (boolean). Prefer emailing the user unless you need `resetPasswordUrl`.',
    '- `expirePassword` forces a change at next login; set `tempPassword: true` only when you need a temporary password returned.',
    '',
    '### Gotchas',
    '- Suspend already clears sessions; still call `clearUserSessions` when you need oauthTokens or forgetDevices options.',
    '- User path segments accept id, login, or unambiguous shortname - always prefer the id from `getUser` for writes.',
    '- `search` and `filter` must not be combined on `searchUsers`.',
    '- Prefer OAuth private_key_jwt (RS256 + kid) over SSWS tokens.',
    '- If token requests fail with invalid_dpop_proof, disable Require DPoP on the Okta API Services app (Kibana does not send DPoP proofs yet).',
  ].join('\n'),

  test: {
    enabled: true,
    description:
      'Verifies connectivity by listing one user from the org (GET /api/v1/users?limit=1).',
    handler: async (ctx) => {
      const orgUrl = getOrgUrl(ctx);
      try {
        await ctx.client.get(
          `${orgUrl}/api/v1/users`,
          withOktaRequestConfig(ctx, { params: { limit: 1 } })
        );
        return { ok: true };
      } catch (error) {
        throw formatOktaError('test', error);
      }
    },
  },
};
