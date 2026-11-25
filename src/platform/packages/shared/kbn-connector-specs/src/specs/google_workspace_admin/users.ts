/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** User actions: find and read directory users, suspend or restore them, sign them out, update them. */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  arrayField,
  compactParams,
  directoryPath,
  googleRequest,
  nextPageToken,
  nonBlank,
  withoutBookkeeping,
} from './client';
import { toUserSummary } from './format';
import {
  DEFAULT_PAGE_SIZE,
  GetUserInputSchema,
  ListUsersInputSchema,
  UpdateUserInputSchema,
  UserKeyInputSchema,
} from './types';
import type { GetUserInput, ListUsersInput, UpdateUserInput, UserKeyInput } from './types';

type GoogleUser = Record<string, unknown>;

/** users.update with only the given fields; Google keeps every field the body leaves out. */
const updateUserFields = async (
  ctx: ActionContext,
  userKey: string,
  fields: Record<string, unknown>
): Promise<GoogleUser> => {
  const { data } = await googleRequest<GoogleUser>(ctx, {
    method: 'PUT',
    path: directoryPath('users', userKey),
    data: fields,
    target: `User ${userKey}`,
  });
  return typeof data === 'object' && data !== null ? data : {};
};

/** Sets the suspended flag and returns the account's state as Google reports it after the call. */
const setSuspended = async (ctx: ActionContext, userKey: string, suspended: boolean) => {
  const user = await updateUserFields(ctx, userKey, { suspended });
  return {
    id: user.id,
    primaryEmail: user.primaryEmail,
    suspended: user.suspended ?? suspended,
    ...(suspended ? { suspensionReason: user.suspensionReason ?? null } : {}),
  };
};

export const userActions = {
  listUsers: {
    isTool: true,
    scope: 'read',
    description:
      'Search directory users. Filter with query in the Google user search syntax, for example isSuspended=true or orgUnitPath=/Sales; lastLoginTime is not a search field (Google rejects it), so filter on the returned lastLoginTime instead. Returns users (email, name, suspension, org unit, admin and 2-step verification flags, last sign-in time) and nextPageToken when more pages exist. Use getUser for the full record.',
    input: ListUsersInputSchema,
    handler: async (ctx, input: ListUsersInput) => {
      const customer = nonBlank(input.customer);
      const domain = nonBlank(input.domain);
      const { data } = await googleRequest<unknown>(ctx, {
        method: 'GET',
        path: directoryPath('users'),
        params: compactParams({
          // Google needs customer or domain; my_customer is the authorized admin's account.
          customer: customer ?? (domain ? undefined : 'my_customer'),
          domain,
          query: nonBlank(input.query),
          orderBy: input.orderBy,
          projection: 'basic',
          maxResults: input.maxResults ?? DEFAULT_PAGE_SIZE,
          pageToken: nonBlank(input.pageToken),
        }),
        target: 'Customer or domain',
      });
      const token = nextPageToken(data);
      return {
        users: arrayField(data, 'users').map(toUserSummary),
        ...(token ? { nextPageToken: token } : {}),
      };
    },
  },

  getUser: {
    isTool: true,
    scope: 'read',
    description:
      'Get the full directory record of one user by primary email, alias or user ID: suspension status and reason, org unit, 2-step verification enrollment and enforcement, last sign-in time, admin flags, recovery email and phone.',
    input: GetUserInputSchema,
    handler: async (ctx, input: GetUserInput) => {
      const { data } = await googleRequest<GoogleUser>(ctx, {
        method: 'GET',
        path: directoryPath('users', input.userKey),
        params: compactParams({ projection: input.projection, viewType: input.viewType }),
        target: `User ${input.userKey}`,
      });
      return withoutBookkeeping(typeof data === 'object' && data !== null ? data : {});
    },
  },

  suspendUser: {
    isTool: false,
    scope: 'destroy',
    description:
      'Suspend a user account so it can no longer sign in. An account that is already suspended stays suspended and the call succeeds. Returns the suspended state and suspension reason.',
    input: UserKeyInputSchema,
    handler: async (ctx, input: UserKeyInput) => setSuspended(ctx, input.userKey, true),
  },

  unsuspendUser: {
    isTool: false,
    scope: 'destroy',
    description:
      'Restore a suspended user account so it can sign in again. An account that is not suspended stays active and the call succeeds. Returns the suspended state.',
    input: UserKeyInputSchema,
    handler: async (ctx, input: UserKeyInput) => setSuspended(ctx, input.userKey, false),
  },

  signOutUser: {
    isTool: false,
    scope: 'destroy',
    description:
      'Sign a user out of all web and device sessions. The account stays active, so the user can sign in again; suspend the account to block that. Succeeds also when the user has no active session.',
    input: UserKeyInputSchema,
    handler: async (ctx, input: UserKeyInput) => {
      await googleRequest(ctx, {
        method: 'POST',
        path: directoryPath('users', input.userKey, 'signOut'),
        target: `User ${input.userKey}`,
      });
      return { userKey: input.userKey, signedOut: true };
    },
  },

  updateUser: {
    isTool: false,
    scope: 'destroy',
    description:
      'Change selected fields of a user: org unit path, require a password change at next sign-in, recovery email, or recovery phone. Only the fields given are changed; at least one is required. Returns the values in the Google answer (null for a field the answer leaves out) and updatedFields, the fields that were sent.',
    input: UpdateUserInputSchema,
    handler: async (ctx, input: UpdateUserInput) => {
      const { userKey, ...fields } = input;
      const changes = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined)
      );
      const user = await updateUserFields(ctx, userKey, changes);
      return {
        id: user.id,
        primaryEmail: user.primaryEmail,
        orgUnitPath: user.orgUnitPath ?? null,
        changePasswordAtNextLogin: user.changePasswordAtNextLogin ?? null,
        recoveryEmail: user.recoveryEmail ?? null,
        recoveryPhone: user.recoveryPhone ?? null,
        updatedFields: Object.keys(changes),
      };
    },
  },
} satisfies ConnectorSpec['actions'];
