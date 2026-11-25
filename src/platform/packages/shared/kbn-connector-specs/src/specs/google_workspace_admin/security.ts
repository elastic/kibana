/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Account security actions: third-party OAuth grants, app passwords and 2SV backup codes. */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  arrayField,
  directoryPath,
  googleRequest,
  isBadRequest,
  isNotFound,
  withoutBookkeeping,
} from './client';
import { redactVerificationCodes } from './format';
import {
  RevokeAppPasswordsInputSchema,
  RevokeUserTokenInputSchema,
  UserKeyInputSchema,
} from './types';
import type { RevokeAppPasswordsInput, RevokeUserTokenInput, UserKeyInput } from './types';

/** Reads the user; fails with "User ... not found" when it does not exist. */
const assertUserExists = async (ctx: ActionContext, userKey: string): Promise<void> => {
  await googleRequest(ctx, {
    method: 'GET',
    path: directoryPath('users', userKey),
    params: { projection: 'basic' },
    target: `User ${userKey}`,
  });
};

const listUserItems = async (ctx: ActionContext, userKey: string, collection: string) => {
  const { data } = await googleRequest<unknown>(ctx, {
    method: 'GET',
    path: directoryPath('users', userKey, collection),
    target: `User ${userKey}`,
  });
  return arrayField<Record<string, unknown>>(data, 'items');
};

/**
 * Sends a DELETE for one item of a user. A 404 is ambiguous (unknown user or unknown item), so
 * the user is read: when it exists the item was already gone and the result is notFound; when it
 * does not, the user's 404 is raised. When `isListed` is given, a 400 is checked the same way:
 * the user's items are read, and the result is notFound only when the item is not among them
 * (an unknown user fails that read); otherwise the 400 is raised. Any other error is raised.
 */
const deleteUserItem = async (
  ctx: ActionContext,
  userKey: string,
  path: string,
  target: string,
  isListed?: () => Promise<boolean>
): Promise<'revoked' | 'notFound'> => {
  try {
    await googleRequest(ctx, { method: 'DELETE', path, target });
    return 'revoked';
  } catch (error) {
    if (isNotFound(error)) {
      await assertUserExists(ctx, userKey);
      return 'notFound';
    }
    if (isListed && isBadRequest(error) && !(await isListed())) {
      return 'notFound';
    }
    throw error;
  }
};

export const securityActions = {
  listUserTokens: {
    isTool: true,
    scope: 'read',
    description:
      "List the third-party apps a user granted OAuth access to, with each app's clientId, display name and granted scopes. Revoking a grant is done by an administrator, not by an agent.",
    input: UserKeyInputSchema,
    handler: async (ctx, input: UserKeyInput) => ({
      items: (await listUserItems(ctx, input.userKey, 'tokens')).map(withoutBookkeeping),
    }),
  },

  revokeUserToken: {
    isTool: false,
    scope: 'destroy',
    description:
      "Revoke a user's OAuth grant for one third-party app by clientId, cutting that app's access to the account. Returns status revoked, or notFound when Google reports no grant for that clientId; an unknown user fails. Google may also accept a clientId the user never granted, so revoked does not prove a grant existed.",
    input: RevokeUserTokenInputSchema,
    handler: async (ctx, input: RevokeUserTokenInput) => ({
      userKey: input.userKey,
      clientId: input.clientId,
      status: await deleteUserItem(
        ctx,
        input.userKey,
        directoryPath('users', input.userKey, 'tokens', input.clientId),
        `OAuth grant ${input.clientId} of user ${input.userKey}`
      ),
    }),
  },

  listAppPasswords: {
    isTool: true,
    scope: 'read',
    description:
      "List a user's app passwords with their codeId, name, creation time and last-used time. Revoking an app password is done by an administrator, not by an agent.",
    input: UserKeyInputSchema,
    handler: async (ctx, input: UserKeyInput) => ({
      items: (await listUserItems(ctx, input.userKey, 'asps')).map(withoutBookkeeping),
    }),
  },

  revokeAppPasswords: {
    isTool: false,
    scope: 'destroy',
    description:
      'Delete one app password of a user by codeId, so apps that use it can no longer sign in. Returns status revoked, or notFound when the user has no app password with that codeId; an unknown user fails.',
    input: RevokeAppPasswordsInputSchema,
    handler: async (ctx, input: RevokeAppPasswordsInput) => ({
      userKey: input.userKey,
      codeId: input.codeId,
      status: await deleteUserItem(
        ctx,
        input.userKey,
        directoryPath('users', input.userKey, 'asps', input.codeId),
        `App password ${input.codeId} of user ${input.userKey}`,
        // Google answers 400 "Invalid Input" for an unknown codeId (seen live), not 404.
        async () =>
          (
            await listUserItems(ctx, input.userKey, 'asps')
          ).some((item) => Number(item.codeId) === input.codeId)
      ),
    }),
  },

  listVerificationCodes: {
    isTool: true,
    scope: 'read',
    description:
      'Count the 2-step verification backup codes that are currently valid for a user, for example to check whether usable codes exist during an account investigation. Returns count and one entry per code; the code values are never returned.',
    input: UserKeyInputSchema,
    handler: async (ctx, input: UserKeyInput) =>
      redactVerificationCodes(await listUserItems(ctx, input.userKey, 'verificationCodes')),
  },

  invalidateVerificationCodes: {
    isTool: false,
    scope: 'destroy',
    description:
      'Invalidate all current 2-step verification backup codes of a user, for example when they may be exposed. The user needs new codes afterwards. Returns invalidated true, also when the user had no valid codes.',
    input: UserKeyInputSchema,
    handler: async (ctx, input: UserKeyInput) => {
      try {
        await googleRequest(ctx, {
          method: 'POST',
          path: directoryPath('users', input.userKey, 'verificationCodes', 'invalidate'),
          target: `User ${input.userKey}`,
        });
      } catch (error) {
        // Google answers 400 "Invalid Input" when the user has no valid codes left (seen live,
        // for example on a repeat call): succeed when no valid code remains, else raise the 400.
        if (
          !isBadRequest(error) ||
          (await listUserItems(ctx, input.userKey, 'verificationCodes')).length > 0
        ) {
          throw error;
        }
      }
      return { userKey: input.userKey, invalidated: true };
    },
  },
} satisfies ConnectorSpec['actions'];
