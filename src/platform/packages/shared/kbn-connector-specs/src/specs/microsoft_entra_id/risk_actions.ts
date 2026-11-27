/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  GraphRequestError,
  buildGraphUrl,
  callGraph,
  callGraphAllowNotFound,
  checkNextLink,
  createDeadline,
  isNotFoundResult,
  toPageResult,
  userSegment,
} from './graph_client';
import type { GraphPage } from './graph_client';
import { ListRiskyUsersInputSchema, RiskyUserIdsInputSchema } from './types';
import type { ListRiskyUsersInput, RiskyUserIdsInput } from './types';

/**
 * confirmCompromised and dismiss: 204 on success, and repeating leaves the same riskState.
 * Graph does not report unknown ids, so each id is looked up first (one read per id, in order):
 * unknown ids are listed under notFound and not sent, and the action fails when none exists.
 */
const postRiskyUsers = async (
  ctx: ActionContext,
  action: 'confirmCompromisedUser' | 'dismissRiskyUser',
  operation: 'confirmCompromised' | 'dismiss',
  requestedIds: string[]
) => {
  const deadline = createDeadline();
  const userIds: string[] = [];
  const notFound: string[] = [];
  for (const id of Array.from(new Set(requestedIds.map((value) => value.toLowerCase())))) {
    const lookup = await callGraphAllowNotFound(
      ctx,
      action,
      { method: 'GET', url: buildGraphUrl(ctx, `/${userSegment(id)}`, { $select: 'id' }) },
      { idempotent: true, deadline }
    );
    (isNotFoundResult(lookup) ? notFound : userIds).push(id);
  }
  if (userIds.length === 0) {
    throw new GraphRequestError(
      `${action} failed: found none of the users ${notFound.join(', ')}; nothing was changed`,
      404
    );
  }
  await callGraph(
    ctx,
    action,
    {
      method: 'POST',
      url: buildGraphUrl(ctx, `/identityProtection/riskyUsers/${operation}`),
      data: { userIds },
    },
    { idempotent: true, deadline }
  );
  return { status: 'requested', userIds, notFound };
};

export const riskActions = {
  listRiskyUsers: {
    isTool: true,
    scope: 'read',
    description:
      "List Identity Protection risky users with riskLevel, riskState, riskDetail and riskLastUpdatedDateTime, optionally filtered (riskLevel eq 'high', or id eq 'user-object-id'). Needs Microsoft Entra ID P2. Returns one page: value[] and nextLink.",
    input: ListRiskyUsersInputSchema,
    handler: async (ctx, input: ListRiskyUsersInput) => {
      const url = input.nextLink
        ? checkNextLink(ctx, input.nextLink, /^\/v1\.0\/identityProtection\/riskyUsers\/?$/i)
        : buildGraphUrl(ctx, '/identityProtection/riskyUsers', {
            $filter: input.filter,
            $top: input.top,
          });
      const response = await callGraph<GraphPage>(
        ctx,
        'listRiskyUsers',
        { method: 'GET', url },
        { idempotent: true }
      );
      return toPageResult(response.data);
    },
  },

  confirmCompromisedUser: {
    isTool: false,
    scope: 'destroy',
    description:
      'Mark users as compromised in Identity Protection: risk level becomes high and riskState confirmedCompromised, so risk-based Conditional Access applies. Needs Microsoft Entra ID P2 and the IdentityRiskyUser.ReadWrite.All application permission with admin consent. Returns status requested with the userIds sent and notFound; fails when none of the users exists.',
    input: RiskyUserIdsInputSchema,
    handler: async (ctx, input: RiskyUserIdsInput) =>
      postRiskyUsers(ctx, 'confirmCompromisedUser', 'confirmCompromised', input.userIds),
  },

  dismissRiskyUser: {
    isTool: false,
    scope: 'destroy',
    description:
      'Dismiss the risk of users in Identity Protection after a false positive: risk level becomes none and riskState dismissed. Needs Microsoft Entra ID P2 and the IdentityRiskyUser.ReadWrite.All application permission with admin consent. Returns status requested with the userIds sent and notFound; fails when none of the users exists.',
    input: RiskyUserIdsInputSchema,
    handler: async (ctx, input: RiskyUserIdsInput) =>
      postRiskyUsers(ctx, 'dismissRiskyUser', 'dismiss', input.userIds),
  },
} satisfies ConnectorSpec['actions'];
