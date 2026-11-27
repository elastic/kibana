/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Google Workspace Admin connector.
 *
 * Account investigation and containment on the Admin SDK: audit events (Reports API), users,
 * OAuth grants, app passwords, 2SV backup codes, groups, admin role assignments and mobile
 * devices (Directory API). Read actions are Agent Builder tools; every state-changing action
 * is isTool false.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import {
  arrayField,
  compactParams,
  directoryPath,
  encodeSegment,
  googleRequest,
  GoogleWorkspaceApiError,
  isBadRequest,
  nextPageToken,
  nonBlank,
  REPORTS_PATH,
  withoutBookkeeping,
} from './client';
import { toDeviceSummary, toRoleSummary } from './format';
import { groupActions } from './groups';
import { securityActions } from './security';
import {
  ActionMobileDeviceInputSchema,
  DEFAULT_ACTIVITY_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  ListActivitiesInputSchema,
  ListMobileDevicesInputSchema,
  ListRoleAssignmentsInputSchema,
  ListRolesInputSchema,
  MOBILE_DEVICE_ACTIONS,
} from './types';
import type {
  ActionMobileDeviceInput,
  ListActivitiesInput,
  ListMobileDevicesInput,
  ListRoleAssignmentsInput,
  ListRolesInput,
} from './types';
import { userActions } from './users';

/** OAuth scopes the actions need, requested together when an administrator authorizes. */
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user',
  'https://www.googleapis.com/auth/admin.directory.user.security',
  'https://www.googleapis.com/auth/admin.directory.group',
  'https://www.googleapis.com/auth/admin.directory.group.member',
  'https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly',
  'https://www.googleapis.com/auth/admin.directory.device.mobile.action',
  'https://www.googleapis.com/auth/admin.reports.audit.readonly',
];

/** my_customer, the account of the authorized administrator, when no customer ID is given. */
const customerOrDefault = (value: string | undefined) => nonBlank(value) ?? 'my_customer';

type GoogleRecord = Record<string, unknown>;

export const GoogleWorkspaceAdmin: ConnectorSpec = {
  metadata: {
    id: '.google_workspace_admin',
    displayName: 'Google Workspace Admin',
    description: i18n.translate('connectorSpecs.googleWorkspaceAdmin.metadata.description', {
      defaultMessage:
        'Search audit events and investigate or contain Google Workspace users, groups and devices with the Admin SDK',
    }),
    // New third party connectors default to an enterprise license by policy. The floor
    // the actions plugin enforces is gold; raise this only, never lower it below gold.
    minimumLicense: 'enterprise',
    // A new connector type must reach Production-NonCanary before it can declare
    // more user-facing features. Ship ['agentBuilder'] first; other feature ids
    // follow in a separate PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        isRecommended: true,
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
            scope: { hidden: true },
            clientId: {
              helpText: i18n.translate(
                'connectorSpecs.googleWorkspaceAdmin.auth.oauth.clientId.helpText',
                {
                  defaultMessage:
                    'Client ID of an OAuth web application client in a Google Cloud project with the Admin SDK API enabled. A Workspace administrator authorizes the connector and grants these scopes: admin.directory.user, admin.directory.user.security, admin.directory.group, admin.directory.group.member, admin.directory.rolemanagement.readonly, admin.directory.device.mobile.action and admin.reports.audit.readonly.',
                }
              ),
            },
          },
        },
        defaults: {
          // access_type=offline and prompt=consent make Google return a refresh token, so the
          // connector keeps working after the one-hour access token expires.
          authorizationUrl:
            'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&prompt=consent',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scope: OAUTH_SCOPES.join(' '),
        },
      },
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          meta: {
            token: {
              helpText: i18n.translate(
                'connectorSpecs.googleWorkspaceAdmin.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'An OAuth 2.0 access token of a Workspace administrator with these scopes: admin.directory.user, admin.directory.user.security, admin.directory.group, admin.directory.group.member, admin.directory.rolemanagement.readonly, admin.directory.device.mobile.action and admin.reports.audit.readonly. Google access tokens expire after about one hour; use OAuth authorization for a lasting connection.',
                }
              ),
            },
          },
        },
      },
    ],
    headers: {
      Accept: 'application/json',
    },
  },

  // One global Admin SDK host (client.ts API_URL), so there is nothing to configure.
  schema: lazySchema(() => z.object({})),

  actions: {
    listActivities: {
      isTool: true,
      scope: 'read',
      description:
        'List audit events of one application (login, admin, token, user_accounts, drive, mobile and others), optionally narrowed to one user, actor IP address, event name, event-parameter filter or time range. Use it to find suspicious sign-ins, admin changes or OAuth grants. Narrow with startTime and eventName rather than reading many pages. Returns items and nextPageToken when more pages exist.',
      input: ListActivitiesInputSchema,
      handler: async (ctx, input: ListActivitiesInput) => {
        const userKey = nonBlank(input.userKey) ?? 'all';
        const { data } = await googleRequest<unknown>(ctx, {
          method: 'GET',
          path: `${REPORTS_PATH}/activity/users/${encodeSegment(
            userKey
          )}/applications/${encodeSegment(input.applicationName)}`,
          params: compactParams({
            startTime: nonBlank(input.startTime),
            endTime: nonBlank(input.endTime),
            eventName: nonBlank(input.eventName),
            filters: nonBlank(input.filters),
            actorIpAddress: nonBlank(input.actorIpAddress),
            maxResults: input.maxResults ?? DEFAULT_ACTIVITY_PAGE_SIZE,
            pageToken: nonBlank(input.pageToken),
          }),
          target: userKey === 'all' ? 'Application or user' : `User ${userKey}`,
        });
        const token = nextPageToken(data);
        return {
          items: arrayField<GoogleRecord>(data, 'items').map(withoutBookkeeping),
          ...(token ? { nextPageToken: token } : {}),
        };
      },
    },

    ...userActions,
    ...securityActions,
    ...groupActions,

    listRoleAssignments: {
      isTool: true,
      scope: 'read',
      description:
        'List admin role assignments of the Workspace account, optionally for one user or one role (not both), to audit who holds admin privileges. Returns items (roleAssignmentId, roleId, assignedTo, assigneeType, scopeType, orgUnitId) and nextPageToken when more pages exist. Use listRoles to turn a roleId into its role name.',
      input: ListRoleAssignmentsInputSchema,
      handler: async (ctx, input: ListRoleAssignmentsInput) => {
        const userKey = nonBlank(input.userKey);
        const { data } = await googleRequest<unknown>(ctx, {
          method: 'GET',
          path: directoryPath('customer', customerOrDefault(input.customer), 'roleassignments'),
          params: compactParams({
            userKey,
            roleId: nonBlank(input.roleId),
            includeIndirectRoleAssignments: input.includeIndirectRoleAssignments,
            maxResults: input.maxResults ?? DEFAULT_PAGE_SIZE,
            pageToken: nonBlank(input.pageToken),
          }),
          target: 'Customer, user or role',
        }).catch((error: unknown) => {
          // Google answers 400 "Invalid user id" for a userKey that is no user of the account (seen live).
          if (userKey && isBadRequest(error) && /invalid user id/i.test((error as Error).message)) {
            throw new GoogleWorkspaceApiError(
              `${userKey} is not a user or group of this Google Workspace account (Google answered "Invalid user id"). Use the primary email, alias email, or ID of an existing user or group.`,
              400
            );
          }
          throw error;
        });
        const token = nextPageToken(data);
        return {
          items: arrayField<GoogleRecord>(data, 'items').map(withoutBookkeeping),
          ...(token ? { nextPageToken: token } : {}),
        };
      },
    },

    listRoles: {
      isTool: true,
      scope: 'read',
      description:
        'List the admin roles of the Workspace account with roleId, roleName, roleDescription, isSuperAdminRole and isSystemRole, to name the roleId values that listRoleAssignments returns, for example to spot super admin assignments. Privilege lists are left out. Returns items and nextPageToken when more pages exist.',
      input: ListRolesInputSchema,
      handler: async (ctx, input: ListRolesInput) => {
        const customer = customerOrDefault(input.customer);
        const { data } = await googleRequest<unknown>(ctx, {
          method: 'GET',
          path: directoryPath('customer', customer, 'roles'),
          params: compactParams({
            maxResults: input.maxResults ?? DEFAULT_PAGE_SIZE,
            pageToken: nonBlank(input.pageToken),
          }),
          target: `Customer ${customer}`,
        });
        const token = nextPageToken(data);
        return {
          items: arrayField(data, 'items').map(toRoleSummary),
          ...(token ? { nextPageToken: token } : {}),
        };
      },
    },

    listMobileDevices: {
      isTool: true,
      scope: 'read',
      description:
        'List managed mobile devices with resourceId, owner email, model, operating system, status and last sync time. Filter with query in the Google mobile device search syntax, for example email:user@example.com. Blocking or wiping a device is done by an administrator, not by an agent. Returns mobiledevices and nextPageToken when more pages exist.',
      input: ListMobileDevicesInputSchema,
      handler: async (ctx, input: ListMobileDevicesInput) => {
        const customerId = customerOrDefault(input.customerId);
        const { data } = await googleRequest<unknown>(ctx, {
          method: 'GET',
          path: directoryPath('customer', customerId, 'devices', 'mobile'),
          params: compactParams({
            query: nonBlank(input.query),
            orderBy: input.orderBy,
            sortOrder: input.sortOrder,
            projection: 'BASIC',
            maxResults: input.maxResults ?? DEFAULT_PAGE_SIZE,
            pageToken: nonBlank(input.pageToken),
          }),
          target: `Customer ${customerId}`,
        });
        const token = nextPageToken(data);
        return {
          mobiledevices: arrayField(data, 'mobiledevices').map(toDeviceSummary),
          ...(token ? { nextPageToken: token } : {}),
        };
      },
    },

    actionMobileDevice: {
      isTool: false,
      scope: 'destroy',
      description:
        'Apply an action to a managed mobile device by its resourceId: block, wipe or account_wipe. A wipe cannot be undone, and a blocked device is unblocked only by approving it in the Google Admin console. Returns status requested.',
      input: ActionMobileDeviceInputSchema,
      handler: async (ctx, input: ActionMobileDeviceInput) => {
        const customerId = customerOrDefault(input.customerId);
        await googleRequest(ctx, {
          method: 'POST',
          path: directoryPath(
            'customer',
            customerId,
            'devices',
            'mobile',
            input.resourceId,
            'action'
          ),
          data: { action: MOBILE_DEVICE_ACTIONS[input.action] },
          target: `Mobile device ${input.resourceId}`,
        }).catch((error: unknown) => {
          // Google answers an unknown resourceId with 500 "Internal error encountered" (seen live),
          // not 404, so a 500 here names both causes instead of only a vendor fault.
          if (error instanceof GoogleWorkspaceApiError && error.status === 500) {
            throw new GoogleWorkspaceApiError(
              `Google answered 500 for mobile device ${input.resourceId}. Google gives this answer for a resourceId that is not a managed device of this account as well as for a server fault: check the resourceId with listMobileDevices. If the device is listed, the action may have been applied: read its status before you repeat the action.`,
              500,
              error.reason,
              error.response?.headers['retry-after']
            );
          }
          throw error;
        });
        return { resourceId: input.resourceId, action: input.action, status: 'requested' };
      },
    },
  },

  skill: [
    '## Google Workspace Admin',
    '',
    'Investigate a Google Workspace account: who it is, how it signed in, which apps and devices reach it, and which groups and admin roles it holds.',
    '',
    '### Common patterns',
    '- Start from an email: call `getUser` for suspension, 2-step verification, org unit, admin flags and last sign-in.',
    '- Sign-in investigation: `listActivities` with applicationName login and userKey set to the email; narrow with startTime, endTime, eventName (for example login_failure or suspicious_login) or actorIpAddress.',
    '- OAuth app review: `listUserTokens` for one user, or `listActivities` with applicationName token for grants across the account.',
    '- Privilege review: `listRoleAssignments` with userKey, then `listRoles` to name each roleId (isSuperAdminRole marks super admin); `listGroups` with userKey for group memberships; `listGroupMembers` shows who is in a privileged group.',
    '- Devices: `listMobileDevices` with query email:user@example.com gives each device resourceId and status.',
    '- listActivities, listUsers, listGroups, listGroupMembers, listRoleAssignments, listRoles and listMobileDevices return nextPageToken when more results exist: pass it as pageToken with the same filters to read the next page.',
    '',
    '### Gotchas',
    '- A 403 that is not a rate limit or quota error means the authorized administrator lacks the scope or admin privilege for that call; do not retry it.',
    '- A device with status BLOCKED stays blocked until an administrator approves it again in the Google Admin console; no action here unblocks it.',
  ].join('\n'),

  test: {
    // Must be true, or the "Test connector" button stays disabled in the UI.
    enabled: true,
    description:
      'Reads one user of the account, which confirms the access token, the admin.directory.user scope and the administrator user-read privilege.',
    handler: async (ctx) => {
      const { data } = await googleRequest<unknown>(ctx, {
        method: 'GET',
        path: directoryPath('users'),
        params: { customer: 'my_customer', maxResults: 1 },
        target: 'Customer my_customer',
      });
      // A 200 that is not a Directory users list (an HTML page, a proxy reply, an empty body)
      // means the request never reached the Directory API: fail instead of reporting Connected.
      const body = typeof data === 'object' && data !== null ? (data as GoogleRecord) : undefined;
      if (!body || (body.kind !== 'admin#directory#users' && !Array.isArray(body.users))) {
        throw new GoogleWorkspaceApiError(
          'Google Workspace returned an unexpected answer to the user list request, not a Directory API users list. Check xpack.actions proxy settings and that the token is a Google access token.'
        );
      }
      return { usersVisible: arrayField(data, 'users').length > 0 };
    },
  },
};
