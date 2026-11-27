/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { DEFAULT_USER_SELECT, GUID_PATTERN } from './constants';
import {
  EVENTUAL_CONSISTENCY,
  GraphRequestError,
  buildGraphUrl,
  callGraph,
  callGraphAllowNotFound,
  checkNextLink,
  createDeadline,
  isNotFoundResult,
  nextLinkHeaders,
  odataString,
  toPageResult,
  userSegment,
  withoutContext,
} from './graph_client';
import type { GraphPage } from './graph_client';
import {
  CreateUserInputSchema,
  GetUserInputSchema,
  ListUsersInputSchema,
  ResetUserPasswordInputSchema,
  UpdateUserInputSchema,
  UserIdInputSchema,
} from './types';
import type {
  CreateUserInput,
  GetUserInput,
  ListUsersInput,
  ResetUserPasswordInput,
  UpdateUserInput,
  UserIdInput,
} from './types';

/** The caller's property list with id added, or the default list. */
export const selectWithId = (select?: string[]): string =>
  Array.from(new Set(['id', ...(select ?? DEFAULT_USER_SELECT)])).join(',');

/** PATCH a user; 404 becomes status notFound. PATCH merges, so repeating it is safe. */
const patchUser = async (
  ctx: ActionContext,
  action: string,
  userId: string,
  body: Record<string, unknown>
) => {
  const result = await callGraphAllowNotFound(
    ctx,
    action,
    { method: 'PATCH', url: buildGraphUrl(ctx, `/${userSegment(userId)}`), data: body },
    { idempotent: true }
  );
  return isNotFoundResult(result)
    ? { status: 'notFound' as const, userId, message: result.message }
    : { status: 'requested' as const, userId };
};

const setAccountEnabled = async (
  ctx: ActionContext,
  action: string,
  userId: string,
  on: boolean
) => {
  const result = await patchUser(ctx, action, userId, { accountEnabled: on });
  return result.status === 'requested' ? { ...result, accountEnabled: on } : result;
};

export const userActions = {
  getUser: {
    isTool: true,
    scope: 'read',
    description:
      'Get one user by object id, userPrincipalName or email address. Returns found, resolvedBy and the user (id, userPrincipalName, displayName, mail, accountEnabled, department, jobTitle, signInSessionsValidFromDateTime, lastPasswordChangeDateTime, or the select list). found is false when no user matches. Call this first to get the id other actions take.',
    input: GetUserInputSchema,
    handler: async (ctx, input: GetUserInput) => {
      const $select = selectWithId(input.select);
      const deadline = createDeadline();
      const direct = await callGraphAllowNotFound<Record<string, unknown>>(
        ctx,
        'getUser',
        { method: 'GET', url: buildGraphUrl(ctx, `/${userSegment(input.userId)}`, { $select }) },
        { idempotent: true, deadline }
      );
      if (!isNotFoundResult(direct)) {
        const resolvedBy = GUID_PATTERN.test(input.userId) ? 'id' : 'userPrincipalName';
        return { found: true, resolvedBy, ...withoutContext(direct.data) };
      }
      if (!input.userId.includes('@')) {
        return { found: false, userId: input.userId };
      }
      // Not an id or userPrincipalName: try the value as a mail address.
      const byMail = await callGraph<GraphPage>(
        ctx,
        'getUser',
        {
          method: 'GET',
          url: buildGraphUrl(ctx, '/users', {
            $filter: `mail eq ${odataString(input.userId)}`,
            $select,
            $top: 2,
          }),
        },
        { idempotent: true, deadline }
      );
      const matches = byMail.data?.value ?? [];
      if (matches.length === 0) {
        return { found: false, userId: input.userId };
      }
      if (matches.length > 1) {
        const ids = matches.map((user) => user.id).join(', ');
        throw new GraphRequestError(
          `getUser failed: more than one user has the mail address ${input.userId} (${ids}); use the object id`
        );
      }
      return { found: true, resolvedBy: 'mail', ...matches[0] };
    },
  },

  listUsers: {
    isTool: true,
    scope: 'read',
    description:
      "Find users with an OData filter (mail eq 'a@contoso.com', department eq 'Sales') or a search. Returns one page: value[] with the default user properties or the select list, count when advancedQuery is set, and nextLink for the next page.",
    input: ListUsersInputSchema,
    handler: async (ctx, input: ListUsersInput) => {
      if (input.nextLink) {
        const url = checkNextLink(ctx, input.nextLink, /^\/v1\.0\/users\/?$/i);
        const headers =
          input.advancedQuery || input.search ? EVENTUAL_CONSISTENCY : nextLinkHeaders(url);
        const page = await callGraph<GraphPage>(
          ctx,
          'listUsers',
          { method: 'GET', url, headers },
          { idempotent: true }
        );
        return toPageResult(page.data);
      }
      const advanced = Boolean(input.advancedQuery || input.search);
      const response = await callGraph<GraphPage>(
        ctx,
        'listUsers',
        {
          method: 'GET',
          url: buildGraphUrl(ctx, '/users', {
            $filter: input.filter,
            $search: input.search,
            $top: input.top,
            $select: selectWithId(input.select),
            $count: input.advancedQuery ? true : undefined,
          }),
          headers: advanced ? EVENTUAL_CONSISTENCY : undefined,
        },
        { idempotent: true }
      );
      return toPageResult(response.data);
    },
  },

  disableUser: {
    isTool: false,
    scope: 'destroy',
    description:
      'Block sign-in for a user (accountEnabled=false); the account and its data are kept. Disabling a disabled user succeeds. Reverse with enableUser. Returns status requested, or notFound.',
    input: UserIdInputSchema,
    handler: async (ctx, input: UserIdInput) =>
      setAccountEnabled(ctx, 'disableUser', input.userId, false),
  },

  enableUser: {
    isTool: false,
    scope: 'destroy',
    description:
      'Allow sign-in again for a user (accountEnabled=true), reversing disableUser after a false positive. Returns status requested, or notFound.',
    input: UserIdInputSchema,
    handler: async (ctx, input: UserIdInput) =>
      setAccountEnabled(ctx, 'enableUser', input.userId, true),
  },

  revokeSignInSessions: {
    isTool: false,
    scope: 'destroy',
    description:
      "Invalidate a user's refresh tokens and session cookies so every app must sign in again; takes effect within a few minutes. Returns status requested, or notFound. getUser then shows a new signInSessionsValidFromDateTime.",
    input: UserIdInputSchema,
    handler: async (ctx, input: UserIdInput) => {
      const result = await callGraphAllowNotFound<{ value?: boolean }>(
        ctx,
        'revokeSignInSessions',
        {
          method: 'POST',
          url: buildGraphUrl(ctx, `/${userSegment(input.userId)}/revokeSignInSessions`),
          // No body: without an explicit type the request goes out as a form, which Graph refuses (415).
          headers: { 'Content-Type': 'application/json' },
        },
        { idempotent: true }
      );
      if (isNotFoundResult(result)) {
        return { status: 'notFound', userId: input.userId, message: result.message };
      }
      return { status: 'requested', userId: input.userId, value: result.data?.value ?? true };
    },
  },

  resetUserPassword: {
    isTool: false,
    scope: 'destroy',
    description:
      "Replace a user's password with newPassword so a stolen password stops working; by default the user must choose a new one at next sign-in. Not possible for federated users. The password is not returned. Returns status requested, or notFound.",
    input: ResetUserPasswordInputSchema,
    handler: async (ctx, input: ResetUserPasswordInput) => {
      const forceChangePasswordNextSignIn = input.forceChangePasswordNextSignIn ?? true;
      const result = await patchUser(ctx, 'resetUserPassword', input.userId, {
        passwordProfile: { password: input.newPassword, forceChangePasswordNextSignIn },
      });
      return result.status === 'requested' ? { ...result, forceChangePasswordNextSignIn } : result;
    },
  },

  createUser: {
    isTool: false,
    scope: 'write',
    description:
      'Create a cloud-only user with displayName, mailNickname, userPrincipalName on a verified domain, an initial password and accountEnabled. Returns the new id, userPrincipalName, displayName and accountEnabled. Right after you create a user or group, Microsoft Graph can answer not found for up to a minute while the change replicates; retry the call.',
    input: CreateUserInputSchema,
    handler: async (ctx, input: CreateUserInput) => {
      const response = await callGraph<Record<string, unknown>>(
        ctx,
        'createUser',
        {
          method: 'POST',
          url: buildGraphUrl(ctx, '/users'),
          data: {
            accountEnabled: input.accountEnabled,
            displayName: input.displayName,
            mailNickname: input.mailNickname,
            userPrincipalName: input.userPrincipalName,
            passwordProfile: {
              password: input.password,
              forceChangePasswordNextSignIn: input.forceChangePasswordNextSignIn ?? true,
            },
          },
        },
        // Creating is not safe to repeat after a 503/504: the first call may have succeeded.
        { idempotent: false }
      );
      const user = response.data ?? {};
      return {
        id: user.id,
        userPrincipalName: user.userPrincipalName,
        displayName: user.displayName,
        accountEnabled: user.accountEnabled,
      };
    },
  },

  updateUser: {
    isTool: false,
    scope: 'destroy',
    description:
      'Set properties of a user, for example department, jobTitle, officeLocation or usageLocation; only the given properties change. Use resetUserPassword for passwords and disableUser or enableUser for sign-in. A user synced from on-premises Active Directory cannot be updated; the error says so. null is sent as given, but may not clear a value. Returns status requested with updatedProperties, or notFound.',
    input: UpdateUserInputSchema,
    handler: async (ctx, input: UpdateUserInput) => {
      const result = await patchUser(ctx, 'updateUser', input.userId, input.properties);
      return result.status === 'requested'
        ? { ...result, updatedProperties: Object.keys(input.properties) }
        : result;
    },
  },

  deleteUser: {
    isTool: false,
    scope: 'destroy',
    description:
      'Delete a user. Microsoft documents that a deleted user stays in the directory deleted items for 30 days and can be restored there, then is removed for good. For incident response prefer disableUser. Returns status requested, or notFound. Right after you create a user or group, Microsoft Graph can answer not found for up to a minute while the change replicates; retry the call.',
    input: UserIdInputSchema,
    handler: async (ctx, input: UserIdInput) => {
      const result = await callGraphAllowNotFound(
        ctx,
        'deleteUser',
        { method: 'DELETE', url: buildGraphUrl(ctx, `/${userSegment(input.userId)}`) },
        { idempotent: true }
      );
      return isNotFoundResult(result)
        ? { status: 'notFound', userId: input.userId, message: result.message }
        : { status: 'requested', userId: input.userId };
    },
  },
} satisfies ConnectorSpec['actions'];
