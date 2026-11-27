/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosResponse } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { DELETABLE_METHOD_TYPES } from './constants';
import type { DeletableMethodType } from './constants';
import {
  GraphRequestError,
  buildGraphUrl,
  callGraphAllowNotFound,
  createDeadline,
  getGraphErrorDetail,
  getStatus,
  graphRequest,
  isNotFound,
  isNotFoundResult,
  remainingMs,
  toGraphError,
  userSegment,
} from './graph_client';
import type { Deadline, GraphPage, NotFound } from './graph_client';
import { DeleteAuthMethodInputSchema, UserIdInputSchema } from './types';
import type { DeleteAuthMethodInput, UserIdInput } from './types';

interface AuthMethod {
  id?: string;
  '@odata.type'?: string;
  [key: string]: unknown;
}

/**
 * methodType derived from @odata.type ('#microsoft.graph.fido2AuthenticationMethod' -> 'fido2'),
 * the value deleteAuthMethod takes.
 */
export const methodTypeOf = (odataType: unknown): string =>
  typeof odataType === 'string'
    ? odataType.replace(/^#?microsoft\.graph\./, '').replace(/AuthenticationMethod$/, '')
    : 'unknown';

const isDeletable = (methodType: string): methodType is DeletableMethodType =>
  (DELETABLE_METHOD_TYPES as readonly string[]).includes(methodType);

const methodUrl = (ctx: ActionContext, userId: string, type: DeletableMethodType, id: string) =>
  buildGraphUrl(
    ctx,
    `/${userSegment(userId)}/authentication/${type}Methods/${encodeURIComponent(id)}`
  );

/**
 * For an id it cannot resolve (seen for the all-zero GUID) Graph answers this path with 400
 * "Unsupported or invalid query filter clause specified for property 'userPrincipalName'":
 * no such user, like a 404.
 */
const isUnresolvedUser = (error: unknown): boolean =>
  getStatus(error) === 400 &&
  /invalid query filter clause.*userPrincipalName/i.test(getGraphErrorDetail(error).message ?? '');

const listMethods = async (
  ctx: ActionContext,
  action: string,
  userId: string,
  deadline: Deadline
): Promise<AxiosResponse<GraphPage<AuthMethod>> | NotFound> => {
  try {
    return await graphRequest<GraphPage<AuthMethod>>(
      ctx,
      { method: 'GET', url: buildGraphUrl(ctx, `/${userSegment(userId)}/authentication/methods`) },
      { idempotent: true, deadline }
    );
  } catch (error) {
    if (isNotFound(error) || isUnresolvedUser(error)) {
      const { message } = getGraphErrorDetail(error);
      return { notFound: true, ...(message ? { message } : {}) };
    }
    throw toGraphError(error, action);
  }
};

interface MethodRef {
  id: string;
  methodType: string;
}

export const authMethodActions = {
  getUserAuthMethods: {
    isTool: true,
    scope: 'read',
    description:
      'List the sign-in and MFA methods a user has registered (password, phone, FIDO2 key, Microsoft Authenticator, software OATH token, email, Windows Hello for Business, Temporary Access Pass). Each item has id, @odata.type and methodType. found is false when the user does not exist.',
    input: UserIdInputSchema,
    handler: async (ctx, input: UserIdInput) => {
      const result = await listMethods(ctx, 'getUserAuthMethods', input.userId, createDeadline());
      if (isNotFoundResult(result)) {
        return { found: false, userId: input.userId, value: [] };
      }
      const value = (result.data?.value ?? []).map((method) => ({
        ...method,
        methodType: methodTypeOf(method['@odata.type']),
      }));
      return { found: true, userId: input.userId, value };
    },
  },

  deleteAuthMethod: {
    isTool: false,
    scope: 'destroy',
    description:
      'Remove one registered sign-in method of a user, for example a stolen FIDO2 key or phone, without a full MFA reset. Takes methodType and methodId from getUserAuthMethods. The password cannot be removed, and a phone that is the default MFA method is refused. Returns status requested, or notFound.',
    input: DeleteAuthMethodInputSchema,
    handler: async (ctx, input: DeleteAuthMethodInput) => {
      const result = await callGraphAllowNotFound(
        ctx,
        'deleteAuthMethod',
        { method: 'DELETE', url: methodUrl(ctx, input.userId, input.methodType, input.methodId) },
        { idempotent: true }
      );
      const ids = { userId: input.userId, methodType: input.methodType, methodId: input.methodId };
      return isNotFoundResult(result)
        ? { status: 'notFound', ...ids, message: result.message }
        : { status: 'requested', ...ids };
    },
  },

  resetUserMfa: {
    isTool: false,
    scope: 'destroy',
    description:
      'Remove every removable sign-in method of a user so MFA must be registered again. Keeps the password, removes the others one by one (phones last) and returns removed[], failed[] with the reason, skipped[], and the counts. Not atomic. status is skipped when nothing could be removed, notFound when the user does not exist.',
    input: UserIdInputSchema,
    handler: async (ctx, input: UserIdInput) => {
      const deadline = createDeadline();
      const listed = await listMethods(ctx, 'resetUserMfa', input.userId, deadline);
      if (isNotFoundResult(listed)) {
        return { status: 'notFound', userId: input.userId, message: listed.message };
      }

      const removed: MethodRef[] = [];
      const failed: Array<MethodRef & { status?: number; message: string }> = [];
      const skipped: Array<MethodRef & { reason: string }> = [];
      const toDelete: Array<{ id: string; methodType: DeletableMethodType }> = [];

      for (const method of listed.data?.value ?? []) {
        const methodType = methodTypeOf(method['@odata.type']);
        const id = String(method.id ?? '');
        if (isDeletable(methodType) && id) {
          toDelete.push({ id, methodType });
        } else {
          const reason =
            methodType === 'password'
              ? 'the password method cannot be removed'
              : 'this method type cannot be removed by this action';
          skipped.push({ id, methodType, reason });
        }
      }
      // A phone can be the default MFA method, which Graph refuses to remove while others exist.
      toDelete.sort((a, b) => Number(a.methodType === 'phone') - Number(b.methodType === 'phone'));

      for (const method of toDelete) {
        if (remainingMs(deadline) <= 0) {
          skipped.push({ ...method, reason: 'time limit reached; run resetUserMfa again' });
          continue;
        }
        try {
          await graphRequest(
            ctx,
            { method: 'DELETE', url: methodUrl(ctx, input.userId, method.methodType, method.id) },
            { idempotent: true, deadline }
          );
          removed.push(method);
        } catch (error) {
          if (isNotFound(error)) {
            skipped.push({ ...method, reason: 'already removed' });
          } else {
            const { message } = toGraphError(error, `Removing ${method.methodType} method`);
            failed.push({ ...method, status: getStatus(error), message });
          }
        }
      }

      if (removed.length === 0 && failed.length > 0) {
        throw new GraphRequestError(
          `resetUserMfa failed: no method could be removed. ${failed
            .map((f) => `${f.methodType} ${f.id}: ${f.message}`)
            .join('; ')}`,
          failed[0].status
        );
      }
      return {
        status: removed.length > 0 ? 'requested' : 'skipped',
        userId: input.userId,
        removed,
        failed,
        skipped,
        removedCount: removed.length,
        failedCount: failed.length,
      };
    },
  },
} satisfies ConnectorSpec['actions'];
