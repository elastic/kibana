/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Group actions: list groups and members, add or remove a member. */

import type { ConnectorSpec } from '../../connector_spec';
import {
  arrayField,
  compactParams,
  directoryPath,
  GoogleWorkspaceApiError,
  googleRequest,
  isNotFound,
  nextPageToken,
  nonBlank,
  withoutBookkeeping,
} from './client';
import {
  AddGroupMemberInputSchema,
  DEFAULT_PAGE_SIZE,
  ListGroupMembersInputSchema,
  ListGroupsInputSchema,
  RemoveGroupMemberInputSchema,
} from './types';
import type {
  AddGroupMemberInput,
  ListGroupMembersInput,
  ListGroupsInput,
  RemoveGroupMemberInput,
} from './types';

type GoogleRecord = Record<string, unknown>;

export const groupActions = {
  listGroups: {
    isTool: true,
    scope: 'read',
    description:
      'List groups of the Workspace account or of one domain, or only the groups a user belongs to (userKey). query takes the Google group search syntax. Returns groups (id, email, name, description, direct member count) and nextPageToken when more pages exist.',
    input: ListGroupsInputSchema,
    handler: async (ctx, input: ListGroupsInput) => {
      const userKey = nonBlank(input.userKey);
      const customer = nonBlank(input.customer);
      const domain = nonBlank(input.domain);
      const { data } = await googleRequest<unknown>(ctx, {
        method: 'GET',
        path: directoryPath('groups'),
        params: compactParams({
          userKey,
          // Google needs one of customer, domain or userKey.
          customer: customer ?? (userKey || domain ? undefined : 'my_customer'),
          domain,
          query: nonBlank(input.query),
          maxResults: input.maxResults ?? DEFAULT_PAGE_SIZE,
          pageToken: nonBlank(input.pageToken),
        }),
        target: 'User, customer or domain',
      });
      const token = nextPageToken(data);
      return {
        groups: arrayField<GoogleRecord>(data, 'groups').map(withoutBookkeeping),
        ...(token ? { nextPageToken: token } : {}),
      };
    },
  },

  listGroupMembers: {
    isTool: true,
    scope: 'read',
    description:
      'List members of a group with their email, role (OWNER, MANAGER, MEMBER), type and status. Filter by roles, or set includeDerivedMembership to include members of nested groups. Returns members and nextPageToken when more pages exist.',
    input: ListGroupMembersInputSchema,
    handler: async (ctx, input: ListGroupMembersInput) => {
      const { data } = await googleRequest<unknown>(ctx, {
        method: 'GET',
        path: directoryPath('groups', input.groupKey, 'members'),
        params: compactParams({
          // The Directory API takes the roles as one comma-separated value.
          roles: input.roles?.length ? input.roles.join(',') : undefined,
          includeDerivedMembership: input.includeDerivedMembership,
          maxResults: input.maxResults ?? DEFAULT_PAGE_SIZE,
          pageToken: nonBlank(input.pageToken),
        }),
        target: `Group ${input.groupKey}`,
      });
      const token = nextPageToken(data);
      return {
        members: arrayField<GoogleRecord>(data, 'members').map(withoutBookkeeping),
        ...(token ? { nextPageToken: token } : {}),
      };
    },
  },

  removeGroupMember: {
    isTool: false,
    scope: 'destroy',
    description:
      'Remove a user or group from a group, for example to strip access granted by a privileged group. Returns status removed, or notMember when it was not a member; an unknown group fails.',
    input: RemoveGroupMemberInputSchema,
    handler: async (ctx, input: RemoveGroupMemberInput) => {
      const result = (status: 'removed' | 'notMember') => ({
        groupKey: input.groupKey,
        memberKey: input.memberKey,
        status,
      });
      try {
        await googleRequest(ctx, {
          method: 'DELETE',
          path: directoryPath('groups', input.groupKey, 'members', input.memberKey),
          target: `Member ${input.memberKey} of group ${input.groupKey}`,
        });
        return result('removed');
      } catch (error) {
        if (!isNotFound(error)) {
          throw error;
        }
        // A 404 means an unknown group or a non-member: read the group to tell them apart.
        await googleRequest(ctx, {
          method: 'GET',
          path: directoryPath('groups', input.groupKey, 'members'),
          params: { maxResults: 1 },
          target: `Group ${input.groupKey}`,
        });
        return result('notMember');
      }
    },
  },

  addGroupMember: {
    isTool: false,
    scope: 'write',
    description:
      'Add a user or group to a group with role MEMBER (default), MANAGER or OWNER, for example to place an account in an investigation group. Returns status added with the new member, or alreadyMember when the email is already a member: its existing role stays and requestedRole is not applied (id, role and type are then null; listGroupMembers shows the current role).',
    input: AddGroupMemberInputSchema,
    handler: async (ctx, input: AddGroupMemberInput) => {
      const role = input.role ?? 'MEMBER';
      try {
        const { data } = await googleRequest<GoogleRecord>(ctx, {
          method: 'POST',
          path: directoryPath('groups', input.groupKey, 'members'),
          data: { email: input.email, role },
          target: `Group ${input.groupKey}`,
        });
        const member = typeof data === 'object' && data !== null ? data : {};
        return {
          groupKey: input.groupKey,
          email: input.email,
          role: member.role ?? role,
          requestedRole: role,
          id: member.id ?? null,
          type: member.type ?? null,
          status: 'added',
        };
      } catch (error) {
        if (error instanceof GoogleWorkspaceApiError && error.status === 409) {
          return {
            groupKey: input.groupKey,
            email: input.email,
            role: null,
            requestedRole: role,
            id: null,
            type: null,
            status: 'alreadyMember',
          };
        }
        throw error;
      }
    },
  },
} satisfies ConnectorSpec['actions'];
