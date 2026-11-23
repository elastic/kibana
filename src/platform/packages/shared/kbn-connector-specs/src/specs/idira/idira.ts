/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Idira Privilege Cloud (formerly CyberArk Privilege Cloud) connector.
 *
 * Privileged-access response actions on the Privilege Cloud REST API (/PasswordVault/API):
 * find and enrich vault accounts, have the CPM rotate, reconcile or verify a credential,
 * manage safe membership, and disable or enable vault users.
 *
 * Auth: a service user's OAuth confidential client (client credentials) against the identity
 * tenant's /oauth2/platformtoken endpoint; API calls go to the tenant's Privilege Cloud host.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec_ui';
import {
  API_URL_QUERY_MESSAGE,
  buildAccountsFilter,
  hasNoQueryOrFragment,
  IdiraApiError,
  idiraPage,
  idiraRequest,
  INSECURE_API_URL_MESSAGE,
  INSECURE_TOKEN_URL_MESSAGE,
  isNotFound,
  isSecureApiUrl,
} from './client';
import {
  ACCOUNTS_DEFAULT_LIMIT,
  AccountIdInputSchema,
  AddAccountInputSchema,
  AddSafeMemberInputSchema,
  ChangeAccountPasswordInputSchema,
  ListAccountsInputSchema,
  ListSafeMembersInputSchema,
  MEMBERS_DEFAULT_LIMIT,
  RemoveSafeMemberInputSchema,
  SetAccountPasswordInputSchema,
  UpdateAccountInputSchema,
  UserIdInputSchema,
} from './types';
import type {
  AccountIdInput,
  AddAccountInput,
  AddSafeMemberInput,
  ChangeAccountPasswordInput,
  ListAccountsInput,
  ListSafeMembersInput,
  RemoveSafeMemberInput,
  SetAccountPasswordInput,
  UpdateAccountInput,
  UserIdInput,
} from './types';

const LIST_ACCOUNTS = 'the List accounts permission on the safe';
const CPM_OPERATIONS = 'the Initiate CPM account management operations permission on the safe';
const MANAGE_MEMBERS = 'the Manage Safe members permission on the safe';
const MANAGE_USERS = 'the vault authorization to manage users';
const IDENTITY_MANAGED_HINT =
  'On tenants that manage users in Identity Administration, an Identity-managed user cannot be changed through the vault Users API and answers 403 or 404: disable that user in Identity Administration instead.';

const accountPath = (accountId: string, suffix = '') =>
  `/Accounts/${encodeURIComponent(accountId)}${suffix}`;
const membersPath = (safeName: string) => `/Safes/${encodeURIComponent(safeName)}/Members`;
/**
 * One member of a safe. The vendor needs a trailing slash when the URL contains a dot (for
 * example jsmith@corp.example.com); without it the API answers 404.
 */
const memberPath = (safeName: string, memberName: string) => {
  const path = `${membersPath(safeName)}/${encodeURIComponent(memberName)}`;
  return memberName.includes('.') ? `${path}/` : path;
};

/** Queues a CPM operation on an account; the API answers once the CPM has accepted it. */
const queueCpmOperation = async (
  ctx: ActionContext,
  accountId: string,
  operation: 'Change' | 'Reconcile' | 'Verify',
  data?: Record<string, unknown>
) => {
  await idiraRequest(ctx, {
    method: 'POST',
    path: accountPath(accountId, `/${operation}`),
    data,
    permission: CPM_OPERATIONS,
    target: `account ${accountId}`,
  });
  return { accountId, queued: true };
};

/** Disables or enables a vault user. */
const setUserEnabled = async (ctx: ActionContext, userId: number, enabled: boolean) => {
  await idiraRequest(ctx, {
    method: 'POST',
    path: `/Users/${encodeURIComponent(String(userId))}/${enabled ? 'enable' : 'disable'}`,
    permission: MANAGE_USERS,
    target: `vault user ${userId}`,
    accessHint: IDENTITY_MANAGED_HINT,
  });
  return { userId, enabled };
};

/**
 * The token URL is checked when the connector is saved: Kibana requests the token, with the
 * client secret, before any action handler runs, so a check inside a handler would come too late.
 */
const TokenUrlSchema = lazySchema(() =>
  z.url().max(2048).refine(isSecureApiUrl, INSECURE_TOKEN_URL_MESSAGE)
);

export const Idira: ConnectorSpec = {
  metadata: {
    id: '.idira',
    displayName: 'Idira Privilege Cloud',
    description: i18n.translate('connectorSpecs.idira.metadata.description', {
      defaultMessage:
        'Find privileged accounts and rotate, reconcile, or verify their credentials in Idira Privilege Cloud',
    }),
    // New third party connectors default to an enterprise license by policy. The floor
    // the actions plugin enforces is gold; raise this only, never lower it below gold.
    minimumLicense: 'enterprise',
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. Ship ['agentBuilder'] first, then add 'workflows'
    // in a follow-up PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        // The API expects "Authorization: Bearer <token>". A fixed token type keeps that scheme
        // whatever case the token response's token_type uses.
        defaults: { tokenEndpointAuthMethod: 'client_secret_post', tokenType: 'Bearer' },
        overrides: {
          fields: { tokenUrl: TokenUrlSchema },
          meta: {
            scope: { hidden: true },
            tokenEndpointAuthMethod: { hidden: true },
            tokenType: { hidden: true },
            tokenUrl: {
              placeholder: 'https://your-tenant-id.id.cyberark.cloud/oauth2/platformtoken',
              helpText: i18n.translate('connectorSpecs.idira.auth.tokenUrl.helpText', {
                defaultMessage:
                  "Your identity tenant's platform token URL: replace your-tenant-id with your identity tenant ID. The service user needs a role with Privilege Cloud API access, and safe membership with these permissions on each safe it acts on: List accounts, View audit log, Initiate CPM account management operations, Specify next account content, Add accounts, Update account properties, Rename accounts, View Safe members, and Manage Safe members. Disabling and enabling vault users needs the vault authorization to manage users. Leave out what you do not use.",
              }),
            },
            clientId: {
              helpText: i18n.translate('connectorSpecs.idira.auth.clientId.helpText', {
                defaultMessage:
                  'The user name of the service user, an Identity Administration user marked as an OAuth confidential client.',
              }),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      apiUrl: UISchemas.url('https://your-subdomain.privilegecloud.cyberark.cloud')
        .max(2048)
        .refine(isSecureApiUrl, INSECURE_API_URL_MESSAGE)
        .refine(hasNoQueryOrFragment, API_URL_QUERY_MESSAGE)
        .describe('Privilege Cloud URL of the tenant')
        .meta({
          label: i18n.translate('connectorSpecs.idira.config.apiUrl.label', {
            defaultMessage: 'Privilege Cloud URL',
          }),
          helpText: i18n.translate('connectorSpecs.idira.config.apiUrl.helpText', {
            defaultMessage:
              'Your tenant address, for example https://your-subdomain.privilegecloud.cyberark.cloud. Tenants that have not moved to Shared Services use https://your-subdomain.privilegecloud.cyberark.com. The token URL is entered with the credentials.',
          }),
        }),
    })
  ),

  validateUrls: { fields: ['apiUrl'] },

  actions: {
    listAccounts: {
      isTool: true,
      scope: 'read',
      description:
        'Search privileged accounts in the vault. Use it first to turn what an alert carries (an account user name, a host address) into an account ID: pass those as search keywords, and narrow with safeName, platformId, a raw filter, or a savedFilter. Returns one page: value (accounts with id, name, address, userName, platformId, safeName, secretType and secretManagement), count (matching accounts), and nextOffset when another page follows; call again with offset set to nextOffset. Only covers safes where the service user has List accounts.',
      input: ListAccountsInputSchema,
      handler: async (ctx, input: ListAccountsInput) => {
        const offset = input.offset ?? 0;
        return idiraPage(ctx, {
          method: 'GET',
          path: '/Accounts',
          offset,
          params: {
            search: input.search,
            searchType: input.searchType,
            filter: buildAccountsFilter(input),
            savedfilter: input.savedFilter,
            sort: input.sort,
            offset,
            limit: input.limit ?? ACCOUNTS_DEFAULT_LIMIT,
          },
          permission: LIST_ACCOUNTS,
          target: 'accounts',
        });
      },
    },

    getAccountDetails: {
      isTool: true,
      scope: 'read',
      description:
        'Get one privileged account by ID: safeName, platformId, address, userName, secretType, createdTime, platformAccountProperties, and secretManagement (automaticManagementEnabled, manualManagementReason, status, lastModifiedTime, lastReconciledTime, lastVerifiedTime, as epoch seconds). Use it to enrich an alert, and after changeAccountPassword, reconcileAccountCredentials or verifyAccountCredentials to see whether the CPM finished: the operation is done when the matching time is later than before the call, and secretManagement.status says succeeded or failed (inProcess while it runs). The record carries no credential.',
      input: AccountIdInputSchema,
      handler: async (ctx, input: AccountIdInput) =>
        (
          await idiraRequest(ctx, {
            method: 'GET',
            path: accountPath(input.accountId),
            permission: LIST_ACCOUNTS,
            target: `account ${input.accountId}`,
          })
        ).data,
    },

    getAccountActivity: {
      isTool: true,
      scope: 'read',
      description:
        'Get the audit activity of one privileged account, for incident investigation: Activities (each with Date as epoch seconds, User, Action such as "Retrieve Password", ActionID, ClientID, MoreInfo, Reason and Alert) and Total. Returned whole: the endpoint has no paging. Needs View audit log on the safe. May be unavailable on some tenants.',
      input: AccountIdInputSchema,
      handler: async (ctx, input: AccountIdInput) =>
        (
          await idiraRequest(ctx, {
            method: 'GET',
            path: accountPath(input.accountId, '/Activities'),
            permission: 'the View audit log permission on the safe',
            target: `activities of account ${input.accountId}`,
          })
        ).data,
    },

    changeAccountPassword: {
      isTool: true,
      scope: 'destroy',
      description:
        "Have the CPM change the account's credential to a new random value now, on the target and in the vault: the first containment step for a compromised credential. The account must be managed by the CPM. Returns accountId and queued: true once the CPM accepts the request, not when it finishes; poll getAccountDetails until secretManagement.lastModifiedTime is later than before and secretManagement.status is succeeded.",
      input: ChangeAccountPasswordInputSchema,
      handler: async (ctx, input: ChangeAccountPasswordInput) =>
        queueCpmOperation(
          ctx,
          input.accountId,
          'Change',
          input.changeEntireGroup === undefined
            ? undefined
            : { ChangeEntireGroup: input.changeEntireGroup }
        ),
    },

    reconcileAccountCredentials: {
      isTool: true,
      scope: 'destroy',
      description:
        "Have the CPM reconcile the account: it uses the platform's reconcile account to set a new credential on the target and in the vault, bringing them back in sync after an out-of-band change. Returns accountId and queued: true once accepted; confirm with getAccountDetails (secretManagement.lastReconciledTime later than before, secretManagement.status succeeded).",
      input: AccountIdInputSchema,
      handler: async (ctx, input: AccountIdInput) =>
        queueCpmOperation(ctx, input.accountId, 'Reconcile'),
    },

    verifyAccountCredentials: {
      isTool: true,
      scope: 'destroy',
      description:
        "Have the CPM check that the vaulted credential still works on the target. It changes no credential, but a failed check marks the account's status as failed. Returns accountId and queued: true once accepted; read the outcome with getAccountDetails (secretManagement.lastVerifiedTime later than before; secretManagement.status succeeded or failed). If it failed, reconcileAccountCredentials restores the sync.",
      input: AccountIdInputSchema,
      handler: async (ctx, input: AccountIdInput) =>
        queueCpmOperation(ctx, input.accountId, 'Verify'),
    },

    setAccountPassword: {
      // Not offered to agents: the caller chooses the new password, and the value is saved with
      // the call.
      isTool: false,
      scope: 'destroy',
      description:
        "Have the CPM change the account's credential to a value you supply (set next password), now or at the next scheduled change. Use changeAccountPassword instead unless a known value is required. newCredentials is a secret: take it from a secret store, never from alert data; it is saved with the call and never returned. Returns accountId and queued: true once accepted; confirm with getAccountDetails. Needs Initiate CPM account management operations and Specify next account content on the safe.",
      input: SetAccountPasswordInputSchema,
      handler: async (ctx, input: SetAccountPasswordInput) => {
        await idiraRequest(ctx, {
          method: 'POST',
          path: accountPath(input.accountId, '/SetNextPassword'),
          data: {
            NewCredentials: input.newCredentials,
            ...(input.changeImmediately === undefined
              ? {}
              : { ChangeImmediately: input.changeImmediately }),
          },
          permission: `${CPM_OPERATIONS}, and Specify next account content`,
          target: `account ${input.accountId}`,
          redact: [input.newCredentials],
        });
        return { accountId: input.accountId, queued: true };
      },
    },

    addAccount: {
      // Not offered to agents: it stores a credential in the vault, and the initial secret is
      // saved with the call.
      isTool: false,
      scope: 'write',
      description:
        'Onboard a privileged account into a safe so the vault stores and the CPM manages its credential. safeName and platformId are required; address, userName, name, secretType, secret (initial credential, never returned), platformAccountProperties and secretManagement are optional. Returns the new account record, including its id, without the secret. Fails with "Already exists" when the account is already in the safe. Needs Add accounts on the safe (and Update account properties when setting properties).',
      input: AddAccountInputSchema,
      handler: async (ctx, input: AddAccountInput) =>
        (
          await idiraRequest(ctx, {
            method: 'POST',
            path: '/Accounts',
            data: input,
            permission: 'the Add accounts permission on the safe',
            target: `safe ${input.safeName} or platform ${input.platformId}`,
            redact: [input.secret],
          })
        ).data,
    },

    updateAccount: {
      // Not offered to agents: a changed address makes the CPM log on to, and send the
      // credential to, another host.
      isTool: false,
      scope: 'destroy',
      description:
        'Replace stored properties of a privileged account: address, name, platformId, userName, or a platform account property, as JSON Patch replace operations (at most 50). Properties the operations do not name keep their values. It does not change the credential. Returns the updated account record. Read the account with getAccountDetails first to record the old values. Needs Update account properties on the safe, and Rename accounts to change the name.',
      input: UpdateAccountInputSchema,
      handler: async (ctx, input: UpdateAccountInput) =>
        (
          await idiraRequest(ctx, {
            method: 'PATCH',
            path: accountPath(input.accountId),
            data: input.operations,
            permission: 'the Update account properties permission on the safe',
            target: `account ${input.accountId}`,
          })
        ).data,
    },

    listSafeMembers: {
      isTool: true,
      scope: 'read',
      description:
        'List the members of a safe: who can reach the accounts in it. Returns one page: value (members with memberName, memberType, memberId, permissions, membershipExpirationDate and isPredefinedUser), count, and nextOffset when another page follows; call again with offset set to nextOffset. Use it to see who can reach the accounts of a safe and to record the permissions of a member before access changes. Needs View Safe members on the safe.',
      input: ListSafeMembersInputSchema,
      handler: async (ctx, input: ListSafeMembersInput) => {
        const offset = input.offset ?? 0;
        return idiraPage(ctx, {
          method: 'GET',
          path: membersPath(input.safeName),
          offset,
          params: {
            search: input.search,
            filter: input.filter,
            sort: input.sort,
            offset,
            limit: input.limit ?? MEMBERS_DEFAULT_LIMIT,
          },
          permission: 'the View Safe members permission on the safe',
          target: `safe ${input.safeName}`,
        });
      },
    },

    addSafeMember: {
      // Not offered to agents: it grants access to the privileged credentials in a safe.
      isTool: false,
      scope: 'write',
      description:
        'Grant an existing vault or directory user, group or role access to a safe with the given permissions. Set membershipExpirationDate (epoch seconds) for just-in-time access: the vault removes the membership by itself at that time. Returns the new member record (memberName, memberType, permissions, membershipExpirationDate, safeName) and added: true. When the member is already in the safe, returns safeName, memberName, added: false and alreadyMember: true without changing its permissions, so a repeated call is safe; compare with listSafeMembers when the permissions matter. Needs Manage Safe members on the safe.',
      input: AddSafeMemberInputSchema,
      handler: async (ctx, input: AddSafeMemberInput) => {
        let data: Record<string, unknown> | undefined;
        try {
          ({ data } = await idiraRequest<Record<string, unknown> | undefined>(ctx, {
            method: 'POST',
            path: membersPath(input.safeName),
            data: {
              memberName: input.memberName,
              memberType: input.memberType,
              searchIn: input.searchIn,
              membershipExpirationDate: input.membershipExpirationDate,
              permissions: input.permissions,
            },
            permission: MANAGE_MEMBERS,
            target: `safe ${input.safeName} or member ${input.memberName}`,
          }));
        } catch (error) {
          if (error instanceof IdiraApiError && error.status === 409) {
            return {
              safeName: input.safeName,
              memberName: input.memberName,
              added: false,
              alreadyMember: true,
            };
          }
          throw error;
        }
        return { ...data, safeName: data?.safeName ?? input.safeName, added: true };
      },
    },

    removeSafeMember: {
      // Not offered to agents: removing a member cuts production access at once.
      isTool: false,
      scope: 'destroy',
      description:
        'Remove a member, and all of its permissions, from a safe: the fastest way to cut access to the accounts in it without touching the credentials. Returns safeName, memberName and removed: true. When the API answers not found, returns removed: false and alreadyAbsent: true, so a repeated call is safe; a missing safe answers the same way, so confirm with listSafeMembers when it matters. Record the permissions with listSafeMembers first: addSafeMember restores them. Needs Manage Safe members on the safe.',
      input: RemoveSafeMemberInputSchema,
      handler: async (ctx, input: RemoveSafeMemberInput) => {
        try {
          await idiraRequest(ctx, {
            method: 'DELETE',
            path: memberPath(input.safeName, input.memberName),
            permission: MANAGE_MEMBERS,
            target: `member ${input.memberName} of safe ${input.safeName}`,
          });
        } catch (error) {
          if (isNotFound(error)) {
            return {
              safeName: input.safeName,
              memberName: input.memberName,
              removed: false,
              alreadyAbsent: true,
            };
          }
          throw error;
        }
        return { safeName: input.safeName, memberName: input.memberName, removed: true };
      },
    },

    suspendUser: {
      // Not offered to agents: disabling a vault user cuts production access at once.
      isTool: false,
      scope: 'destroy',
      description:
        'Disable a vault user by numeric user ID so it can no longer log on to the vault (Privilege Cloud has no manual suspend; disable is the equivalent). Acts on vault users only, never on the Identity directory account; users managed in Identity Administration answer 403 or 404. Returns userId and enabled: false. Reverse with activateUser.',
      input: UserIdInputSchema,
      handler: async (ctx, input: UserIdInput) => setUserEnabled(ctx, input.userId, false),
    },

    activateUser: {
      // Not offered to agents: it lifts the containment of a disabled user.
      isTool: false,
      scope: 'destroy',
      description:
        'Enable a disabled vault user, by numeric user ID, once the investigation clears it. It does not clear a lockout after failed logons. Vault users only; users managed in Identity Administration answer 403 or 404. Returns userId and enabled: true.',
      input: UserIdInputSchema,
      handler: async (ctx, input: UserIdInput) => setUserEnabled(ctx, input.userId, true),
    },
  },

  skill: [
    '## Idira Privilege Cloud',
    '',
    'Privileged-access response on the Privilege Cloud vault (formerly CyberArk Privilege Cloud): find accounts, review their audit activity and who can reach their safe, and have the Central Policy Manager (CPM) rotate, reconcile or verify credentials.',
    '',
    '### Finding IDs',
    '- An alert carries a user name or host address, not an account ID. Call `listAccounts` with them as `search` keywords (narrow with `safeName` or `platformId`), then use `value[].id` (for example "12_3") with the other account actions.',
    '- If several accounts match, compare `address`, `userName` and `safeName`, or ask; never act on a guessed ID.',
    '- `safeName` from an account record is the input for `listSafeMembers`.',
    '',
    '### Containing a compromised credential',
    '1. `getAccountDetails` and record `secretManagement.lastModifiedTime`.',
    '2. `changeAccountPassword` (random value). It returns `queued: true`, not completion.',
    '3. Poll `getAccountDetails` until `secretManagement.lastModifiedTime` is later than the recorded value; `secretManagement.status` then says `succeeded` or `failed` (`inProcess` while the CPM works). If it failed or the target was changed out of band, call `reconcileAccountCredentials` and poll `secretManagement.lastReconciledTime` the same way.',
    '4. Record who can reach the safe with `listSafeMembers` (with `permissions`) and report it.',
    '5. Removing safe members, granting access, disabling or re-enabling vault users, setting a chosen password and changing account properties are done by a person in the Privilege Cloud portal: say what should be done there.',
    '',
    '### Gotchas',
    '- Rotating and reconciling change production credentials: act only on a confirmed incident or an explicit request, and say what you are about to do.',
    '- `verifyAccountCredentials` changes no credential, but a failed verification marks the account as failed.',
    '- Permissions are per safe: a 403 on one safe and not another means the service user lacks the named permission on that safe.',
    '- `listAccounts` and `listSafeMembers` return one page; continue with `offset` set to `nextOffset` until `nextOffset` is absent.',
  ].join('\n'),

  test: {
    // enabled must be explicitly set to true, otherwise the "Test connector"
    // button stays disabled in the UI even though a handler is defined.
    enabled: true,
    description:
      'Gets a token from the identity tenant and lists at most one account, to verify the token URL, the client credentials, the Privilege Cloud URL, and API access.',
    handler: async (ctx) => {
      await idiraRequest(ctx, {
        method: 'GET',
        path: '/Accounts',
        params: { limit: 1 },
        permission: 'Privilege Cloud API access (a role with Privilege Cloud access)',
        target: 'the Privilege Cloud Accounts API (check the Privilege Cloud URL)',
      });
      return { message: 'Connected to Idira Privilege Cloud.' };
    },
  },
};
