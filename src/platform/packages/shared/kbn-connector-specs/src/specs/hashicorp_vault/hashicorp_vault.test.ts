/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import type { ActionContext } from '../../connector_spec';
import { HashicorpVaultConnector } from './hashicorp_vault';

const ADDRESS = 'https://vault.example.com:8200';
const CANARY = 'CANARY-9f3e2ab1-do-not-log';

describe('HashicorpVaultConnector', () => {
  const mockClient = {
    get: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;

  const makeContext = (config: Record<string, unknown> = { address: ADDRESS }): ActionContext =>
    ({
      client: mockClient,
      config,
      log: { debug: jest.fn() },
    } as unknown as ActionContext);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has the expected id, license, and feature ids', () => {
      expect(HashicorpVaultConnector.metadata.id).toBe('.hashicorp_vault');
      expect(HashicorpVaultConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
      expect(HashicorpVaultConnector.metadata.supportedFeatureIds).not.toContain('workflows');
    });
  });

  describe('auth', () => {
    it('reuses api_key_header with a fixed, hidden X-Vault-Token header field', () => {
      const authTypes = HashicorpVaultConnector.auth?.types;
      expect(authTypes).toHaveLength(2);

      const authDef = authTypes?.[0] as {
        type: string;
        defaults: Record<string, unknown>;
      };
      expect(authDef.type).toBe('api_key_header');
      expect(authDef.defaults).toEqual({ headerField: 'X-Vault-Token' });
    });

    it('also offers vault_approle (Phase 3) as a selectable auth type', () => {
      const authTypes = HashicorpVaultConnector.auth?.types;
      expect(authTypes?.[1]).toBe('vault_approle');
    });
  });

  describe('schema', () => {
    it('exposes only address and namespace in config', () => {
      const shape = (HashicorpVaultConnector.schema as { shape: Record<string, unknown> }).shape;
      expect(Object.keys(shape).sort()).toEqual(['address', 'namespace']);
    });
  });

  describe('readSecret action', () => {
    const readSecret = HashicorpVaultConnector.actions.readSecret;

    it('is marked sensitiveOutput and is not exposed as an Agent Builder tool', () => {
      expect(readSecret.sensitiveOutput).toBe(true);
      expect(readSecret.isTool).toBeFalsy();
    });

    it('every action on this secret-resolving connector is sensitiveOutput and non-streaming', () => {
      const unsafeActions = Object.entries(HashicorpVaultConnector.actions)
        .filter(
          ([, action]) => action.sensitiveOutput !== true || action.supportsStreaming === true
        )
        .map(([name]) => name);
      expect(unsafeActions).toEqual([]);
    });

    it('builds the request URL from address + path and returns all fields as strings', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: { data: { data: { username: 'svc-account', port: 5432, enabled: true } } },
      });

      const result = await readSecret.handler(makeContext(), { path: 'secret/data/db' });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ADDRESS}/v1/secret/data/db`,
        expect.objectContaining({ headers: undefined })
      );
      expect(result).toEqual({
        values: { username: 'svc-account', port: '5432', enabled: 'true' },
      });
    });

    it('returns a single field when `field` is provided', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: { data: { data: { username: 'svc-account', password: 'hunter2' } } },
      });

      const result = await readSecret.handler(makeContext(), {
        path: 'secret/data/db',
        field: 'username',
      });

      expect(result).toEqual({ value: 'svc-account' });
    });

    it('sends X-Vault-Namespace when namespace is configured', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { data: { data: {} } } });

      await readSecret.handler(makeContext({ address: ADDRESS, namespace: 'team-a' }), {
        path: 'secret/data/db',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ADDRESS}/v1/secret/data/db`,
        expect.objectContaining({ headers: { 'X-Vault-Namespace': 'team-a' } })
      );
    });

    it('percent-encodes path segments', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { data: { data: {} } } });

      await readSecret.handler(makeContext(), { path: 'secret/data/my app' });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ADDRESS}/v1/secret/data/my%20app`,
        expect.anything()
      );
    });

    describe('canary-secret failure paths', () => {
      it('never leaks a canary value when the requested field does not exist', async () => {
        mockClient.get.mockResolvedValueOnce({
          data: { data: { data: { other: CANARY } } },
        });

        await expect(
          readSecret.handler(makeContext(), { path: 'secret/data/db', field: 'missing' })
        ).rejects.toThrow(/was not found/);

        try {
          await readSecret.handler(makeContext(), { path: 'secret/data/db', field: 'missing2' });
        } catch (error) {
          expect((error as Error).message).not.toContain(CANARY);
        }
      });

      it('never leaks a canary value embedded in a Vault 403 error response body', async () => {
        const err = Object.assign(new Error('Forbidden'), {
          response: { status: 403, data: { errors: [`permission denied for token ${CANARY}`] } },
        });
        mockClient.get.mockRejectedValueOnce(err);

        await expect(readSecret.handler(makeContext(), { path: 'secret/data/db' })).rejects.toThrow(
          /HTTP 403/
        );

        try {
          await readSecret.handler(makeContext(), { path: 'secret/data/db' });
        } catch (error) {
          expect((error as Error).message).not.toContain(CANARY);
        }
      });

      it('never leaks a canary value embedded in a Vault 404 error response body', async () => {
        const err = Object.assign(new Error('Not Found'), {
          response: { status: 404, data: { errors: [] } },
        });
        mockClient.get.mockRejectedValueOnce(err);

        await expect(
          readSecret.handler(makeContext(), { path: 'secret/data/missing' })
        ).rejects.toThrow(/HTTP 404/);
      });

      it('never leaks a canary value in a malformed / KV-v1-shaped response', async () => {
        // KV v1 shape: { data: {...} } with no nested `data.data`.
        mockClient.get.mockResolvedValueOnce({ data: { data: { secretValue: CANARY } } });

        await expect(readSecret.handler(makeContext(), { path: 'secret/db' })).rejects.toThrow(
          /Unexpected response shape/
        );

        try {
          await readSecret.handler(makeContext(), { path: 'secret/db' });
        } catch (error) {
          expect((error as Error).message).not.toContain(CANARY);
        }
      });

      it('never leaks a canary value for a non-scalar (object) field', async () => {
        mockClient.get.mockResolvedValueOnce({
          data: { data: { data: { nested: { inner: CANARY } } } },
        });

        await expect(readSecret.handler(makeContext(), { path: 'secret/data/db' })).rejects.toThrow(
          /unsupported type \(object\/array\)/
        );

        try {
          await readSecret.handler(makeContext(), { path: 'secret/data/db' });
        } catch (error) {
          expect((error as Error).message).not.toContain(CANARY);
        }
      });

      it('never leaks a canary value for a non-scalar (array) field', async () => {
        mockClient.get.mockResolvedValueOnce({
          data: { data: { data: { tags: ['a', CANARY] } } },
        });

        await expect(readSecret.handler(makeContext(), { path: 'secret/data/db' })).rejects.toThrow(
          /unsupported type \(object\/array\)/
        );
      });
    });
  });

  describe('test handler', () => {
    const testSpec = HashicorpVaultConnector.test;

    it('checks token validity via auth/token/lookup-self', async () => {
      mockClient.get.mockResolvedValueOnce({ status: 200, data: {} });

      const result = await testSpec.handler(makeContext());

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ADDRESS}/v1/auth/token/lookup-self`,
        expect.objectContaining({ headers: undefined })
      );
      expect(result).toEqual({});
    });

    it('throws a generic, value-free error when authentication fails', async () => {
      const err = Object.assign(new Error('Forbidden'), {
        response: { status: 403, data: { errors: [`bad token ${CANARY}`] } },
      });
      mockClient.get.mockRejectedValueOnce(err);

      await expect(testSpec.handler(makeContext())).rejects.toThrow(/HTTP 403/);

      try {
        await testSpec.handler(makeContext());
      } catch (error) {
        expect((error as Error).message).not.toContain(CANARY);
      }
    });
  });

  describe('address validation', () => {
    it('rejects a non-https address before making any request', async () => {
      await expect(
        HashicorpVaultConnector.actions.readSecret.handler(
          makeContext({ address: 'http://vault.example.com' }),
          { path: 'secret/data/db' }
        )
      ).rejects.toThrow(/https/);
      expect(mockClient.get).not.toHaveBeenCalled();
    });
  });
});
