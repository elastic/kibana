/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosError, AxiosResponse } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { GRAPH_VERSION, MAX_ASSIGNMENT_PAGES, MAX_PAGE_SIZE } from './constants';
import {
  GraphRequestError,
  buildGraphUrl,
  callGraph,
  callGraphAllowNotFound,
  checkNextLink,
  createDeadline,
  getStatus,
  graphRequest,
  isNotFound,
  isNotFoundResult,
  remainingMs,
  toGraphError,
  toPageResult,
  userSegment,
} from './graph_client';
import type { Deadline, GraphPage, NotFound } from './graph_client';
import {
  ListUserAppRoleAssignmentsInputSchema,
  RequestInputSchema,
  RevokeUserAppAssignmentInputSchema,
} from './types';
import type {
  ListUserAppRoleAssignmentsInput,
  RequestInput,
  RevokeUserAppAssignmentInput,
} from './types';

const ASSIGNMENTS_PATH = /^\/v1\.0\/users(\/[^/]+|\('[^/]+'\))\/appRoleAssignments\/?$/i;

interface Assignment {
  id?: string;
  resourceId?: string;
  [key: string]: unknown;
}

const assignmentUrl = (ctx: ActionContext, userId: string, assignmentId: string) =>
  buildGraphUrl(
    ctx,
    `/${userSegment(userId)}/appRoleAssignments/${encodeURIComponent(assignmentId)}`
  );

/** Every assignment of the user, up to MAX_ASSIGNMENT_PAGES pages; undefined when the user is unknown. */
const readAllAssignments = async (ctx: ActionContext, userId: string, deadline: Deadline) => {
  const items: Assignment[] = [];
  let url: string | undefined = buildGraphUrl(ctx, `/${userSegment(userId)}/appRoleAssignments`, {
    $top: MAX_PAGE_SIZE,
  });
  for (let page = 0; url && page < MAX_ASSIGNMENT_PAGES; page++) {
    const result: AxiosResponse<GraphPage<Assignment>> | NotFound = await callGraphAllowNotFound<
      GraphPage<Assignment>
    >(ctx, 'revokeUserAppAssignment', { method: 'GET', url }, { idempotent: true, deadline });
    if (isNotFoundResult(result)) return undefined;
    items.push(...(result.data?.value ?? []));
    const next: string | undefined = result.data?.['@odata.nextLink'];
    url = next ? checkNextLink(ctx, next, ASSIGNMENTS_PATH) : undefined;
  }
  return { items, complete: url === undefined };
};

const revokeByResource = async (
  ctx: ActionContext,
  userId: string,
  resourceId: string,
  deadline: Deadline
) => {
  const all = await readAllAssignments(ctx, userId, deadline);
  if (!all) {
    return {
      status: 'notFound',
      userId,
      resourceId,
      removed: [],
      failed: [],
      skipped: [],
      message: 'user not found',
    };
  }
  const matching = all.items.filter(
    (a) => typeof a.id === 'string' && a.resourceId?.toLowerCase() === resourceId.toLowerCase()
  );
  const incomplete = all.complete ? {} : { incomplete: true };
  if (matching.length === 0) {
    return {
      status: 'notFound',
      userId,
      resourceId,
      removed: [],
      failed: [],
      skipped: [],
      message: 'the user has no assignment to this application',
      ...incomplete,
    };
  }
  const removed: string[] = [];
  const failed: Array<{ id: string; status?: number; message: string }> = [];
  const skipped: Array<{ id: string; reason: string }> = [];
  for (const { id } of matching as Array<{ id: string }>) {
    if (remainingMs(deadline) <= 0) {
      skipped.push({ id, reason: 'time limit reached; run the action again' });
      continue;
    }
    try {
      await graphRequest(
        ctx,
        { method: 'DELETE', url: assignmentUrl(ctx, userId, id) },
        { idempotent: true, deadline }
      );
      removed.push(id);
    } catch (error) {
      if (isNotFound(error)) {
        skipped.push({ id, reason: 'already removed' });
      } else {
        const { message } = toGraphError(error, 'Removing assignment');
        failed.push({ id, status: getStatus(error), message });
      }
    }
  }
  if (removed.length === 0 && failed.length > 0) {
    throw new GraphRequestError(
      `revokeUserAppAssignment failed: no assignment could be removed. ${failed
        .map((f) => `${f.id}: ${f.message}`)
        .join('; ')}`,
      failed[0].status
    );
  }
  return {
    status: removed.length > 0 ? 'requested' : 'skipped',
    userId,
    resourceId,
    removed,
    failed,
    skipped,
    ...incomplete,
  };
};

export const appActions = {
  listUserAppRoleAssignments: {
    isTool: true,
    scope: 'read',
    description:
      'List the app role assignments of a user: id, resourceId and resourceDisplayName of the application, appRoleId and principalId. Returns one page: value[] and nextLink; found is false when the user does not exist.',
    input: ListUserAppRoleAssignmentsInputSchema,
    handler: async (ctx, input: ListUserAppRoleAssignmentsInput) => {
      const url = input.nextLink
        ? checkNextLink(ctx, input.nextLink, ASSIGNMENTS_PATH)
        : buildGraphUrl(ctx, `/${userSegment(input.userId)}/appRoleAssignments`, {
            $top: input.top ?? 100,
          });
      const result = await callGraphAllowNotFound<GraphPage>(
        ctx,
        'listUserAppRoleAssignments',
        { method: 'GET', url },
        { idempotent: true }
      );
      if (isNotFoundResult(result)) {
        return { found: false, userId: input.userId, value: [] };
      }
      return { found: true, ...toPageResult(result.data) };
    },
  },

  revokeUserAppAssignment: {
    isTool: false,
    scope: 'destroy',
    description:
      "Remove a user's access to an application. Give appRoleAssignmentId (from listUserAppRoleAssignments) to remove one assignment, or resourceId to remove every assignment of the user to that application. Returns status requested with removed[], failed[] and skipped[], or notFound when nothing matched.",
    input: RevokeUserAppAssignmentInputSchema,
    handler: async (ctx, input: RevokeUserAppAssignmentInput) => {
      if (input.resourceId) {
        return revokeByResource(ctx, input.userId, input.resourceId, createDeadline());
      }
      const assignmentId = input.appRoleAssignmentId as string;
      const result = await callGraphAllowNotFound(
        ctx,
        'revokeUserAppAssignment',
        { method: 'DELETE', url: assignmentUrl(ctx, input.userId, assignmentId) },
        { idempotent: true }
      );
      return isNotFoundResult(result)
        ? {
            status: 'notFound',
            userId: input.userId,
            removed: [],
            failed: [],
            skipped: [],
            message: result.message,
          }
        : {
            status: 'requested',
            userId: input.userId,
            removed: [assignmentId],
            failed: [],
            skipped: [],
          };
    },
  },

  request: {
    isTool: false,
    scope: 'destroy',
    description:
      "Send a request to a Microsoft Graph path no other action covers, with the connector's permissions. Takes method, a relative path without the version (for example /users/{id}/authentication/temporaryAccessPassMethods), query and body; v1.0 is used, or beta when the connector's useBeta setting is true. Returns Graph's HTTP status and response body; check status.",
    input: RequestInputSchema,
    handler: async (ctx, input: RequestInput) => {
      const version = ctx.config?.useBeta === 'true' ? 'beta' : GRAPH_VERSION;
      try {
        const response = await graphRequest(
          ctx,
          {
            method: input.method,
            url: buildGraphUrl(ctx, input.path, input.query ?? {}, version),
            ...(input.body !== undefined ? { data: input.body } : {}),
            // Without an explicit type a POST, PATCH or PUT with no body goes out as a form, which Graph refuses (415).
            ...(input.method === 'GET' || input.method === 'DELETE'
              ? {}
              : { headers: { 'Content-Type': 'application/json' } }),
          },
          // Only a GET is repeated after a 503/504; 429 is retried for every method.
          { idempotent: input.method === 'GET' }
        );
        return { status: response.status, data: response.data ?? null };
      } catch (error) {
        const response = (error as AxiosError | undefined)?.response;
        if (response) {
          return { status: response.status, data: response.data ?? null };
        }
        throw toGraphError(error, 'request');
      }
    },
  },
} satisfies ConnectorSpec['actions'];

/** Connectivity check: one cheap read that needs the User.Read.All application permission. */
export const testConnection = async (ctx: ActionContext) => {
  await callGraph(
    ctx,
    'Connection test',
    { method: 'GET', url: buildGraphUrl(ctx, '/users', { $top: 1, $select: 'id' }) },
    { idempotent: true }
  );
  return {};
};
