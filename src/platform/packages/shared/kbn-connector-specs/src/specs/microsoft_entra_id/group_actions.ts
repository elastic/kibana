/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../connector_spec';
import { GRAPH_VERSION } from './constants';
import {
  EVENTUAL_CONSISTENCY,
  buildGraphUrl,
  callGraph,
  callGraphAllowNotFound,
  checkNextLink,
  getGraphErrorDetail,
  getGraphOrigin,
  getStatus,
  graphRequest,
  isNotFoundResult,
  nextLinkHeaders,
  toGraphError,
  toPageResult,
  userSegment,
} from './graph_client';
import type { GraphPage } from './graph_client';
import {
  GetUserGroupsInputSchema,
  GroupMembershipInputSchema,
  ListGroupMembersInputSchema,
  ListGroupsInputSchema,
} from './types';
import type {
  GetUserGroupsInput,
  GroupMembershipInput,
  ListGroupMembersInput,
  ListGroupsInput,
} from './types';

/** /v1.0/users/{id}/transitiveMemberOf or /memberOf, also in the users('{upn}') key form. */
const USER_MEMBERSHIP_PATH =
  /^\/v1\.0\/users(\/[^/]+|\('[^/]+'\))\/(transitiveMemberOf|memberOf)\/?$/i;

/** Graph's answer when the user is already a member: 400 "...object references already exist". */
const isAlreadyMember = (error: unknown): boolean =>
  getStatus(error) === 400 && /already exist/i.test(getGraphErrorDetail(error).message ?? '');

export const groupActions = {
  getUserGroups: {
    isTool: true,
    scope: 'read',
    description:
      'List the groups and directory roles a user belongs to, nested memberships included by default. Returns one page: value[] (id, displayName, @odata.type) and nextLink; found is false when the user does not exist.',
    input: GetUserGroupsInputSchema,
    handler: async (ctx, input: GetUserGroupsInput) => {
      const relation = input.transitive === false ? 'memberOf' : 'transitiveMemberOf';
      const url = input.nextLink
        ? checkNextLink(ctx, input.nextLink, USER_MEMBERSHIP_PATH)
        : buildGraphUrl(ctx, `/${userSegment(input.userId)}/${relation}`, { $top: input.top });
      const result = await callGraphAllowNotFound<GraphPage>(
        ctx,
        'getUserGroups',
        { method: 'GET', url },
        { idempotent: true }
      );
      if (isNotFoundResult(result)) {
        return { found: false, userId: input.userId, value: [] };
      }
      return { found: true, ...toPageResult(result.data) };
    },
  },

  listGroupMembers: {
    isTool: true,
    scope: 'read',
    description:
      'List the members (users, groups, devices, service principals) of a group, for example a privileged group. Returns one page: value[] and nextLink; found is false when the group does not exist.',
    input: ListGroupMembersInputSchema,
    handler: async (ctx, input: ListGroupMembersInput) => {
      const $select = input.select
        ? Array.from(new Set(['id', ...input.select])).join(',')
        : undefined;
      const url = input.nextLink
        ? checkNextLink(ctx, input.nextLink, /^\/v1\.0\/groups\/[^/?#]+\/members\/?$/i)
        : buildGraphUrl(ctx, `/groups/${encodeURIComponent(input.groupId)}/members`, {
            $top: input.top,
            $select,
          });
      const result = await callGraphAllowNotFound<GraphPage>(
        ctx,
        'listGroupMembers',
        { method: 'GET', url },
        { idempotent: true }
      );
      if (isNotFoundResult(result)) {
        return { found: false, groupId: input.groupId, value: [] };
      }
      return { found: true, ...toPageResult(result.data) };
    },
  },

  listGroups: {
    isTool: true,
    scope: 'read',
    description:
      "Find groups with an OData filter (displayName eq 'Quarantine') or a search. Returns one page: value[], count when advancedQuery is set, and nextLink.",
    input: ListGroupsInputSchema,
    handler: async (ctx, input: ListGroupsInput) => {
      const advanced = Boolean(input.advancedQuery || input.search);
      const url = input.nextLink
        ? checkNextLink(ctx, input.nextLink, /^\/v1\.0\/groups\/?$/i)
        : buildGraphUrl(ctx, '/groups', {
            $filter: input.filter,
            $search: input.search,
            $top: input.top,
            $count: input.advancedQuery ? true : undefined,
          });
      // A nextLink passed alone keeps the header when its own query is an advanced one.
      const headers = advanced ? EVENTUAL_CONSISTENCY : nextLinkHeaders(url);
      const response = await callGraph<GraphPage>(
        ctx,
        'listGroups',
        { method: 'GET', url, headers },
        { idempotent: true }
      );
      return toPageResult(response.data);
    },
  },

  addUserToGroup: {
    isTool: false,
    scope: 'write',
    description:
      'Add a user to a group by object ids, for example a quarantine group that Conditional Access blocks. Returns status requested, or skipped when the user is already a member. An existing membership is recognised from the text of the error message Microsoft Graph returns; any other rejected request fails. Right after you create a user or group, Microsoft Graph can answer not found for up to a minute while the change replicates; retry the call.',
    input: GroupMembershipInputSchema,
    handler: async (ctx, input: GroupMembershipInput) => {
      const ids = { groupId: input.groupId, userId: input.userId };
      const memberRef = `${getGraphOrigin(
        ctx
      )}/${GRAPH_VERSION}/directoryObjects/${encodeURIComponent(input.userId)}`;
      try {
        await graphRequest(
          ctx,
          {
            method: 'POST',
            url: buildGraphUrl(ctx, `/groups/${encodeURIComponent(input.groupId)}/members/$ref`),
            data: { '@odata.id': memberRef },
            headers: { 'Content-Type': 'application/json' },
          },
          // Adding is not repeated after a 503/504; Graph rejects a throttled call before acting.
          { idempotent: false }
        );
        return { status: 'requested', ...ids };
      } catch (error) {
        if (isAlreadyMember(error)) {
          return { status: 'skipped', ...ids, reason: 'already a member' };
        }
        throw toGraphError(error, 'addUserToGroup');
      }
    },
  },

  removeUserFromGroup: {
    isTool: false,
    scope: 'destroy',
    description:
      'Remove a user from a group, for example a privileged group. Only the membership is removed; the user is untouched. Returns status requested, or notFound with the reason when the group, the user or the membership does not exist. Right after you create a user or group, Microsoft Graph can answer not found for up to a minute while the change replicates; retry the call.',
    input: GroupMembershipInputSchema,
    handler: async (ctx, input: GroupMembershipInput) => {
      const ids = { groupId: input.groupId, userId: input.userId };
      // Always the /$ref route: without it Graph would delete the member object itself.
      const result = await callGraphAllowNotFound(
        ctx,
        'removeUserFromGroup',
        {
          method: 'DELETE',
          url: buildGraphUrl(
            ctx,
            `/groups/${encodeURIComponent(input.groupId)}/members/${encodeURIComponent(
              input.userId
            )}/$ref`
          ),
        },
        { idempotent: true }
      );
      return isNotFoundResult(result)
        ? { status: 'notFound', ...ids, message: result.message }
        : { status: 'requested', ...ids };
    },
  },
} satisfies ConnectorSpec['actions'];
