/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IdiraRequestOptions } from './client';
import { idiraRequest } from './client';
import { createContext, httpError } from './test_helpers';

const get = (overrides: Partial<IdiraRequestOptions> = {}): IdiraRequestOptions => ({
  method: 'GET',
  path: '/Accounts/12_3',
  permission: 'the List accounts permission on the safe',
  target: 'account 12_3',
  ...overrides,
});

describe('Idira client error messages', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requests that were never sent and requests sent with an unknown outcome', () => {
    it('does not say a write was applied when the Actions allowedHosts check refused it before sending', async () => {
      const { ctx, request } = createContext();
      // The Actions request interceptor throws a plain Error before any network dispatch.
      request.mockRejectedValue(
        new Error(
          'target url "https://acme.privilegecloud.cyberark.cloud/PasswordVault/API/Accounts/12_3" is not added to the Kibana config xpack.actions.allowedHosts'
        )
      );

      const error = await idiraRequest(ctx, get({ method: 'POST' })).catch((e) => e);
      expect(error.message).toContain('xpack.actions.allowedHosts');
      expect(error.message).not.toContain('may have applied');
    });

    it.each([
      'CERT_HAS_EXPIRED',
      'DEPTH_ZERO_SELF_SIGNED_CERT',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'ERR_TLS_CERT_ALTNAME_INVALID',
      'ERR_SSL_WRONG_VERSION_NUMBER',
      'ERR_INVALID_URL',
      'ENOTFOUND',
    ])('does not say a write was applied when it failed before sending with %s', async (code) => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        Object.assign(new Error(`request failed: ${code}`), { isAxiosError: true, code })
      );

      const error = await idiraRequest(ctx, get({ method: 'DELETE' })).catch((e) => e);
      expect(error.message).toBe(
        `Privilege Cloud request DELETE /PasswordVault/API/Accounts/12_3 failed: request failed: ${code}.`
      );
    });

    it.each(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE', undefined])(
      'says a sent write may have been applied after %s',
      async (code) => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(
          Object.assign(new Error('request failed'), { isAxiosError: true, code })
        );

        const error = await idiraRequest(ctx, get({ method: 'PATCH' })).catch((e) => e);
        expect(error.message).toContain('Privilege Cloud may have applied the change');
      }
    );
  });

  describe('short secrets and the 409 target', () => {
    it('leaves out a vendor message that contains a short secret instead of cutting the secret out', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        httpError(400, {
          ErrorCode: 'PASWS013E',
          ErrorMessage: 'Password e does not meet the password policy',
        })
      );

      const error = await idiraRequest(
        ctx,
        get({ method: 'POST', data: { NewCredentials: 'e' }, redact: ['e'] })
      ).catch((e) => e);
      expect(error.message).toBe(
        'Privilege Cloud rejected the request POST /PasswordVault/API/Accounts/12_3 (HTTP 400 PASWS013E: (message left out because it contains a value the call sent)).'
      );
      expect(error.message).not.toContain('REDACTED');
      expect(error.message).not.toContain('Password e');
    });

    it.each(['z', 'zq1', 'Pass12!'])(
      'keeps the vendor message when a short secret (%s) is not in it',
      async (secret) => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(httpError(400, { ErrorMessage: 'Bad request body' }));

        const error = await idiraRequest(
          ctx,
          get({ method: 'POST', data: { NewCredentials: secret }, redact: [secret] })
        ).catch((e) => e);
        expect(error.message).toContain('(HTTP 400: Bad request body)');
        expect(error.message).not.toContain('REDACTED');
      }
    );

    it('cuts out a secret of 8 characters and keeps the rest of the vendor message', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        httpError(400, { ErrorMessage: 'Password Pass123! does not meet the policy' })
      );

      const error = await idiraRequest(
        ctx,
        get({ method: 'POST', data: { NewCredentials: 'Pass123!' }, redact: ['Pass123!'] })
      ).catch((e) => e);
      expect(error.message).toContain('(HTTP 400: Password [REDACTED] does not meet the policy)');
    });

    it('leaves out a network message that contains a short secret', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        Object.assign(new Error('write EPIPE x7'), { isAxiosError: true, code: 'EPIPE' })
      );

      const error = await idiraRequest(
        ctx,
        get({ method: 'POST', data: { NewCredentials: 'x7' }, redact: ['x7'] })
      ).catch((e) => e);
      expect(error.message).toContain(
        'failed: (message left out because it contains a value the call sent).'
      );
      expect(error.message).not.toContain('x7');
    });

    it('names conflictTarget on a 409 and target otherwise', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(httpError(409, { ErrorMessage: 'exists' }))
        .mockRejectedValueOnce(httpError(409, { ErrorMessage: 'exists' }));

      const named = await idiraRequest(
        ctx,
        get({ method: 'POST', conflictTarget: 'the account a@b in safe S1' })
      ).catch((e) => e);
      expect(named.message).toBe('Already exists: the account a@b in safe S1 (HTTP 409: exists).');
      const fallback = await idiraRequest(ctx, get({ method: 'POST' })).catch((e) => e);
      expect(fallback.message).toBe('Already exists: account 12_3 (HTTP 409: exists).');
    });
  });
});
