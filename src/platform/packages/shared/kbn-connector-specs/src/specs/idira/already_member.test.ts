/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, httpError, run } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  describe('addSafeMember already a member', () => {
    it.each([
      ['ErrorCode', 400, { ErrorCode: 'UserAlreadyMemberException', ErrorMessage: 'x' }],
      [
        'ErrorMessage',
        400,
        { ErrorCode: 'PASWS', ErrorMessage: 'UserAlreadyMemberException: jsmith' },
      ],
      ['ErrorCode with 409', 409, { ErrorCode: 'UserAlreadyMemberException' }],
    ])(
      'reads UserAlreadyMemberException in the %s as already a member',
      async (_where, status, body) => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(httpError(status as number, body));

        await expect(
          run('addSafeMember', ctx, {
            safeName: 'SOC-Servers',
            memberName: 'jsmith',
            memberType: 'User',
            permissions: { listAccounts: true },
          })
        ).resolves.toMatchObject({ added: false, alreadyMember: true, permissions: null });
        expect(request).toHaveBeenCalledTimes(1);
      }
    );

    it.each([
      [400, { ErrorCode: 'SFWS0007E', ErrorMessage: 'Member not found' }, 'rejected the request'],
      [403, {}, 'Manage Safe members'],
    ])(
      'still fails on %p without the exception, even for a member named like it',
      async (status, body, text) => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(httpError(status, body));

        await expect(
          run('addSafeMember', ctx, {
            safeName: 'SOC-Servers',
            memberName: 'UserAlreadyMemberException',
            memberType: 'User',
            permissions: { listAccounts: true },
          })
        ).rejects.toThrow(text);
      }
    );
  });
});
