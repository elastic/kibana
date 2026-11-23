/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchRoleDescriptor, KibanaRole } from '../../../../common';
import { getPrivilegedRoleName } from '../../../../common';
import type { ApiClientResponse } from './api_client';
import type { ApiKey, RequestAuthFixture } from './api_key';
import { requestAuthFixture } from './api_key';
import { coreWorkerFixtures } from './saml_auth';

jest.mock('./saml_auth', () => ({ coreWorkerFixtures: { extend: jest.fn() } }));
jest.mock('../../../../common', () => {
  const roles = jest.requireActual<typeof import('../../../../common/services/roles')>(
    '../../../../common/services/roles'
  );
  return {
    ...jest.requireActual<typeof import('../../../../common/services/custom_role')>(
      '../../../../common/services/custom_role'
    ),
    getPrivilegedRoleName: jest.fn(roles.getPrivilegedRoleName),
    measurePerformanceAsync: (
      _log: { debug: (message: string) => void },
      _label: string,
      operation: () => Promise<void>
    ) => operation(),
  };
});

type RoleDescriptor = KibanaRole | ElasticsearchRoleDescriptor;
type KeyReference = Pick<ApiKey, 'id' | 'name'>;
interface CreatePayload {
  name: string;
  metadata: Record<string, never>;
  role_descriptors?: Record<string, ElasticsearchRoleDescriptor>;
  kibana_role_descriptors?: Record<string, KibanaRole>;
}
interface InvalidatePayload {
  apiKeys: KeyReference[];
  isAdmin: boolean;
}
interface InvalidateResponse {
  itemsInvalidated: KeyReference[] | null;
  errors: Array<KeyReference & { error?: { message: string } }> | null;
}

const noAccessRole: ElasticsearchRoleDescriptor = { cluster: [], indices: [], applications: [] };
const kibanaRole: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: ['read'], feature: {}, spaces: ['owned-space'] }],
};
const makeKey = (id: string, name = id): ApiKey => ({
  id,
  name,
  api_key: `secret-${id}`,
  encoded: `encoded-${id}`,
});
const response = <T>(body: T, statusCode = 200): ApiClientResponse<T> => ({
  statusCode,
  statusMessage: statusCode === 200 ? 'OK' : 'Unavailable',
  headers: {},
  body,
});

const createDependencies = (onTeardown: () => void) => {
  let keyCount = 0;
  const create = jest.fn<Promise<ApiClientResponse<ApiKey>>, [CreatePayload]>(async ({ name }) =>
    response(makeKey(`key-${++keyCount}`, name))
  );
  const invalidate = jest.fn<Promise<ApiClientResponse<InvalidateResponse>>, [InvalidatePayload]>(
    async ({ apiKeys }) => response({ itemsInvalidated: apiKeys, errors: [] })
  );
  const dependencies = {
    log: {
      debug: jest.fn((message: string) => {
        if (message === 'Waiting for pending API credential operations') onTeardown();
      }),
      info: jest.fn<void, [string]>(),
    },
    config: { serverless: true, projectType: 'security' as const },
    samlAuth: {
      customRoleName: 'custom_role_worker_1',
      setCustomRole: jest.fn<Promise<void>, [RoleDescriptor]>().mockResolvedValue(undefined),
      fetchBuiltInRoleDescriptor: jest
        .fn<Promise<ElasticsearchRoleDescriptor>, [string]>()
        .mockResolvedValue(noAccessRole),
      session: {
        validateRole: jest.fn<void, [string]>(),
        getApiCredentialsForRole: jest
          .fn<Promise<{ Cookie: string }>, [string]>()
          .mockResolvedValue({ Cookie: 'sid=admin-session' }),
      },
    },
    defaultRoles: {
      availableRoles: new Map([
        ['viewer', noAccessRole],
        ['editor', noAccessRole],
      ]),
      rolesFilePath: 'roles.yml',
    },
    apiClient: {
      post: jest.fn(
        (
          url: string,
          options: {
            body: CreatePayload | InvalidatePayload;
            headers: Record<string, string>;
            responseType: 'json';
          }
        ) => {
          if (url === 'internal/security/api_key' && 'name' in options.body) {
            return create(options.body);
          }
          if (url === 'internal/security/api_key/invalidate' && 'apiKeys' in options.body) {
            return invalidate(options.body);
          }
          throw new Error(`Unexpected API request: ${url}`);
        }
      ),
    },
  };
  return { dependencies, create, invalidate };
};

type RegisteredFixture = (
  dependencies: ReturnType<typeof createDependencies>['dependencies'],
  use: (auth: RequestAuthFixture) => Promise<void>,
  workerInfo: { parallelIndex: number }
) => Promise<void>;

// Capture the actual callback registered with Playwright; do not replace its lifecycle with a helper.
const registration = jest.mocked(coreWorkerFixtures.extend).mock.calls[0][0] as {
  requestAuth: [RegisteredFixture, { scope: string }];
};
const [runFixture, fixtureOptions] = registration.requestAuth;

const createHarness = () => {
  const ready = Promise.withResolvers<RequestAuthFixture>();
  const endUse = Promise.withResolvers<void>();
  const teardownStarted = Promise.withResolvers<void>();
  const mocks = createDependencies(() => teardownStarted.resolve());
  return {
    ...mocks,
    start: async (use: (auth: RequestAuthFixture) => Promise<void> = () => endUse.promise) => {
      const done = runFixture(
        mocks.dependencies,
        (auth) => {
          ready.resolve(auth);
          return use(auth);
        },
        { parallelIndex: 0 }
      );
      // Observe fixture failures immediately, even when a test asserts them after resolving a gate.
      void done.catch(() => {});
      return {
        auth: await ready.promise,
        done,
        close: async () => {
          endUse.resolve();
          await teardownStarted.promise;
        },
      };
    },
  };
};

describe('requestAuth worker fixture', () => {
  it('registers a worker-scoped fixture', () => {
    expect(requestAuthFixture).toBe(jest.mocked(coreWorkerFixtures.extend).mock.results[0].value);
    expect(coreWorkerFixtures.extend).toHaveBeenCalledTimes(1);
    expect(fixtureOptions).toEqual({ scope: 'worker' });
  });

  it('preserves normal credentials, descriptor ownership, headers and aliases', async () => {
    const harness = createHarness();
    const { auth, close, done } = await harness.start();
    const custom = await auth.getApiKeyForCustomRole(kibanaRole);
    const raw = await auth.getApiKeyForCustomRole(noAccessRole);
    await auth.getApiKey('viewer');
    await auth.getApiKeyForAdmin();
    await auth.getApiKeyForViewer();
    await auth.getApiKeyForPrivilegedUser();
    await auth.getApiKeyForBuiltInRole('machine_learning_user');

    expect(custom.apiKeyHeader).toEqual({ Authorization: 'ApiKey encoded-key-1' });
    expect(raw.apiKeyHeader).toEqual({ Authorization: 'ApiKey encoded-key-2' });
    expect(harness.create.mock.calls.map(([payload]) => payload)).toEqual([
      expect.objectContaining({ kibana_role_descriptors: { custom_role_worker_1: kibanaRole } }),
      expect.objectContaining({ role_descriptors: { custom_role_worker_1: noAccessRole } }),
      expect.objectContaining({ role_descriptors: { viewer: noAccessRole } }),
      expect.objectContaining({ role_descriptors: {} }),
      expect.objectContaining({ role_descriptors: { viewer: noAccessRole } }),
      expect.objectContaining({ role_descriptors: { editor: noAccessRole } }),
      expect.objectContaining({ role_descriptors: { machine_learning_user: noAccessRole } }),
    ]);
    expect(custom.apiKey.name).toBe('myTestApiKey-0-custom_role_worker_1-worker-1');
    expect(harness.dependencies.samlAuth.setCustomRole).not.toHaveBeenCalled();
    expect(harness.dependencies.apiClient.post).toHaveBeenCalledWith(
      'internal/security/api_key',
      expect.objectContaining({
        headers: {
          'kbn-xsrf': 'some-xsrf-token',
          'x-elastic-internal-origin': 'kibana',
          Cookie: 'sid=admin-session',
        },
      })
    );

    await close();
    await done;
    expect(harness.invalidate).toHaveBeenCalledWith({
      apiKeys: harness.create.mock.calls.map(([{ name }], index) => ({
        id: `key-${index + 1}`,
        name,
      })),
      isAdmin: true,
    });
    expect(harness.dependencies.log.info).toHaveBeenLastCalledWith('Invalidated 7 API keys');
  });

  it.each([
    { name: 'Kibana', descriptor: kibanaRole, field: 'kibana_role_descriptors' },
    { name: 'empty Elasticsearch', descriptor: noAccessRole, field: 'role_descriptors' },
    {
      name: 'Elasticsearch',
      descriptor: {
        cluster: ['monitor'],
        indices: [
          {
            names: ['logs-*'],
            privileges: ['read'],
            query: '{"term":{"team":"scout"}}',
            field_security: { grant: ['team', 'message'] },
          },
        ],
        applications: [{ application: 'kibana-.kibana', privileges: ['read'], resources: ['*'] }],
        run_as: ['scout-reader'],
      },
      field: 'role_descriptors',
    },
  ])(
    'embeds the unchanged $name descriptor without altering an existing role slot',
    async ({ descriptor, field }) => {
      const harness = createHarness();
      const { samlAuth } = harness.dependencies;
      const existingRole: KibanaRole = {
        elasticsearch: { cluster: [] },
        kibana: [{ base: ['all'], feature: {}, spaces: ['existing-role-space'] }],
      };
      let persistedRole: RoleDescriptor = existingRole;
      samlAuth.setCustomRole.mockImplementation(async (role) => {
        persistedRole = role;
      });
      await samlAuth.setCustomRole(existingRole);
      const originalDescriptor = structuredClone(descriptor);
      const { auth, close, done } = await harness.start();

      const { apiKey } = await auth.getApiKeyForCustomRole(descriptor);

      expect(harness.create).toHaveBeenCalledWith({
        name: 'myTestApiKey-0-custom_role_worker_1-worker-1',
        metadata: {},
        [field]: { [samlAuth.customRoleName]: originalDescriptor },
      });
      expect(descriptor).toEqual(originalDescriptor);
      expect(samlAuth.session.getApiCredentialsForRole).toHaveBeenCalledWith('admin');
      expect(samlAuth.fetchBuiltInRoleDescriptor).not.toHaveBeenCalled();
      await close();
      await done;
      expect(samlAuth.setCustomRole.mock.calls).toEqual([[existingRole]]);
      expect(persistedRole).toBe(existingRole);
      expect(harness.invalidate).toHaveBeenCalledWith({
        apiKeys: [{ id: apiKey.id, name: apiKey.name }],
        isAdmin: true,
      });
    }
  );

  it('includes a late key in cleanup and blocks the resumed hook from creating its next key', async () => {
    const harness = createHarness();
    const { auth, close, done } = await harness.start();
    const first = await auth.getApiKeyForAdmin();
    const createStarted = Promise.withResolvers<void>();
    const lateResponse = Promise.withResolvers<ApiClientResponse<ApiKey>>();
    harness.create.mockImplementationOnce(() => {
      createStarted.resolve();
      return lateResponse.promise;
    });
    const resumedHook = auth
      .getApiKeyForCustomRole(kibanaRole)
      .then(() => auth.getApiKeyForCustomRole(noAccessRole));
    const rejectedHook = expect(resumedHook).rejects.toThrow('after teardown has started');
    await createStarted.promise;
    await close();
    expect(harness.invalidate).not.toHaveBeenCalled();

    const lateKey = makeKey('late');
    lateResponse.resolve(response(lateKey));
    await rejectedHook;
    await done;
    expect(harness.dependencies.samlAuth.setCustomRole).not.toHaveBeenCalled();
    expect(harness.create).toHaveBeenCalledTimes(2);
    expect(harness.invalidate).toHaveBeenCalledWith({
      apiKeys: [first.apiKey, lateKey].map(({ id, name }) => ({ id, name })),
      isAdmin: true,
    });
  });

  it.each(['custom session fetch', 'built-in lookup'] as const)(
    'drains an admitted %s before creating its key and releasing dependent cleanup',
    async (phase) => {
      const harness = createHarness();
      const { auth, close, done } = await harness.start();
      const phaseStarted = Promise.withResolvers<void>();
      const phaseResult = Promise.withResolvers<void>();
      if (phase === 'custom session fetch') {
        harness.dependencies.samlAuth.session.getApiCredentialsForRole.mockImplementationOnce(
          async () => {
            phaseStarted.resolve();
            await phaseResult.promise;
            return { Cookie: 'sid=admin-session' };
          }
        );
      } else {
        harness.dependencies.samlAuth.fetchBuiltInRoleDescriptor.mockImplementationOnce(
          async () => {
            phaseStarted.resolve();
            await phaseResult.promise;
            return noAccessRole;
          }
        );
      }
      const credential =
        phase === 'custom session fetch'
          ? auth.getApiKeyForCustomRole(kibanaRole)
          : auth.getApiKeyForBuiltInRole('machine_learning_user');
      const dependentCleanup = jest.fn();
      const released = done.then(dependentCleanup);
      await phaseStarted.promise;
      await close();
      expect(harness.create).not.toHaveBeenCalled();
      expect(harness.invalidate).not.toHaveBeenCalled();
      expect(dependentCleanup).not.toHaveBeenCalled();

      phaseResult.resolve();
      await credential;
      await released;
      expect(harness.create).toHaveBeenCalledTimes(1);
      expect(harness.invalidate).toHaveBeenCalledTimes(1);
      expect(dependentCleanup).toHaveBeenCalledTimes(1);
      expect(harness.dependencies.samlAuth.setCustomRole).not.toHaveBeenCalled();
    }
  );

  it('preserves a built-in lookup rejection without falling back to custom credentials', async () => {
    const harness = createHarness();
    const failure = new Error('fetchBuiltInRoleDescriptor is not supported on Serverless projects');
    harness.dependencies.samlAuth.fetchBuiltInRoleDescriptor.mockRejectedValueOnce(failure);
    const { auth, close, done } = await harness.start();
    await expect(auth.getApiKeyForBuiltInRole('kibana_admin')).rejects.toBe(failure);
    await close();
    await done;
    expect(harness.dependencies.samlAuth.fetchBuiltInRoleDescriptor).toHaveBeenCalledWith(
      'kibana_admin'
    );
    expect(harness.dependencies.samlAuth.setCustomRole).not.toHaveBeenCalled();
    expect(harness.dependencies.samlAuth.session.getApiCredentialsForRole).not.toHaveBeenCalled();
    expect(harness.dependencies.apiClient.post).not.toHaveBeenCalled();
  });

  it('preserves a rejected create while continuing to drain and clean a successful create', async () => {
    const harness = createHarness();
    const { auth, close, done } = await harness.start();
    const bothCreatesStarted = Promise.withResolvers<void>();
    const successfulResponse = Promise.withResolvers<ApiClientResponse<ApiKey>>();
    const failedResponse = Promise.withResolvers<ApiClientResponse<ApiKey>>();
    const failure = new Error('create request failed');
    harness.create
      .mockImplementationOnce(() => successfulResponse.promise)
      .mockImplementationOnce(() => {
        bothCreatesStarted.resolve();
        return failedResponse.promise;
      });
    const successfulCreate = auth.getApiKeyForAdmin();
    const rejectedCreate = expect(auth.getApiKeyForViewer()).rejects.toBe(failure);
    await bothCreatesStarted.promise;
    await close();
    failedResponse.reject(failure);
    await rejectedCreate;
    expect(harness.invalidate).not.toHaveBeenCalled();
    successfulResponse.resolve(response(makeKey('successful')));
    await successfulCreate;
    await done;
    expect(harness.invalidate).toHaveBeenCalledWith({
      apiKeys: [{ id: 'successful', name: 'successful' }],
      isAdmin: true,
    });
  });

  it('drains a rejected custom credential session fetch without starting a key request', async () => {
    const harness = createHarness();
    const { auth, close, done } = await harness.start();
    const sessionStarted = Promise.withResolvers<void>();
    const sessionResult = Promise.withResolvers<{ Cookie: string }>();
    const failure = new Error('session fetch failed');
    harness.dependencies.samlAuth.session.getApiCredentialsForRole.mockImplementationOnce(() => {
      sessionStarted.resolve();
      return sessionResult.promise;
    });
    const rejectedCreate = expect(auth.getApiKeyForCustomRole(kibanaRole)).rejects.toBe(failure);
    await sessionStarted.promise;
    await close();
    sessionResult.reject(failure);
    await rejectedCreate;
    await done;
    expect(harness.dependencies.apiClient.post).not.toHaveBeenCalled();
    expect(harness.dependencies.samlAuth.setCustomRole).not.toHaveBeenCalled();
    expect(harness.dependencies.samlAuth.session.getApiCredentialsForRole).toHaveBeenCalledTimes(1);
  });

  const entryPoints = [
    {
      name: 'custom',
      create: (auth: RequestAuthFixture) => auth.getApiKeyForCustomRole(kibanaRole),
    },
    {
      name: 'built-in',
      create: (auth: RequestAuthFixture) => auth.getApiKeyForBuiltInRole('monitoring_user'),
    },
    { name: 'predefined', create: (auth: RequestAuthFixture) => auth.getApiKey('viewer') },
    { name: 'admin', create: (auth: RequestAuthFixture) => auth.getApiKeyForAdmin() },
    { name: 'viewer', create: (auth: RequestAuthFixture) => auth.getApiKeyForViewer() },
    { name: 'privileged', create: (auth: RequestAuthFixture) => auth.getApiKeyForPrivilegedUser() },
  ];
  it.each(entryPoints)(
    'rejects $name credentials while draining without new side effects',
    async ({ create }) => {
      const harness = createHarness();
      const { auth, close, done } = await harness.start();
      const roleLookup = jest.spyOn(harness.dependencies.defaultRoles.availableRoles, 'get');
      const sessionStarted = Promise.withResolvers<void>();
      const sessionResult = Promise.withResolvers<{ Cookie: string }>();
      harness.dependencies.samlAuth.session.getApiCredentialsForRole.mockImplementationOnce(() => {
        sessionStarted.resolve();
        return sessionResult.promise;
      });
      jest.mocked(getPrivilegedRoleName).mockClear();
      const admitted = auth.getApiKeyForAdmin();
      await sessionStarted.promise;
      await close();
      await expect(create(auth)).rejects.toThrow('after teardown has started');
      expect(roleLookup).not.toHaveBeenCalled();
      expect(getPrivilegedRoleName).not.toHaveBeenCalled();
      expect(harness.dependencies.samlAuth.session.validateRole).not.toHaveBeenCalled();
      expect(harness.dependencies.samlAuth.session.getApiCredentialsForRole).toHaveBeenCalledTimes(
        1
      );
      expect(harness.dependencies.samlAuth.setCustomRole).not.toHaveBeenCalled();
      expect(harness.dependencies.samlAuth.fetchBuiltInRoleDescriptor).not.toHaveBeenCalled();
      expect(harness.dependencies.apiClient.post).not.toHaveBeenCalled();
      sessionResult.resolve({ Cookie: 'sid=admin-session' });
      await admitted;
      await done;
    }
  );

  it('does not invalidate when no keys were created', async () => {
    const harness = createHarness();
    const { close, done } = await harness.start();
    await close();
    await done;
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.dependencies.samlAuth.session.getApiCredentialsForRole).not.toHaveBeenCalled();
  });

  it('runs cleanup when use propagates a failed create and preserves that error', async () => {
    const harness = createHarness();
    const failure = new Error('failed second create');
    harness.create
      .mockResolvedValueOnce(response(makeKey('successful')))
      .mockRejectedValueOnce(failure);
    const { done } = await harness.start(async (auth) => {
      await auth.getApiKeyForAdmin();
      await auth.getApiKeyForCustomRole(kibanaRole);
    });
    await expect(done).rejects.toBe(failure);
    expect(harness.invalidate).toHaveBeenCalledWith({
      apiKeys: [{ id: 'successful', name: 'successful' }],
      isAdmin: true,
    });
  });

  it('also closes admission when use throws synchronously', async () => {
    const harness = createHarness();
    const failure = new Error('use failed synchronously');
    const { auth, done } = await harness.start(() => {
      throw failure;
    });
    await expect(done).rejects.toBe(failure);
    await expect(auth.getApiKeyForAdmin()).rejects.toThrow('after teardown has started');
    expect(harness.dependencies.apiClient.post).not.toHaveBeenCalled();
  });

  it('surfaces HTTP creation errors without registering a successful key', async () => {
    const harness = createHarness();
    harness.create.mockResolvedValueOnce(response(makeKey('failed'), 503));
    const { auth, close, done } = await harness.start();
    await expect(auth.getApiKeyForAdmin()).rejects.toThrow('Failed to create API key');
    await close();
    await done;
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'HTTP failure',
      result: response({ itemsInvalidated: [], errors: [] }, 503),
      message: 'HTTP 503',
    },
    {
      name: 'per-item failure',
      result: response({
        itemsInvalidated: [],
        errors: [{ id: 'key-1', name: 'failed', error: { message: 'forbidden' } }],
      }),
      message: 'API key invalidation errors',
    },
    {
      name: 'missing key',
      result: response({ itemsInvalidated: [], errors: [] }),
      message: 'Incomplete API key invalidation',
    },
    {
      name: 'malformed itemsInvalidated array',
      result: response({ itemsInvalidated: null, errors: [] }),
      message: 'Invalid API key invalidation response',
    },
    {
      name: 'malformed errors array',
      result: response({ itemsInvalidated: [{ id: 'key-1', name: 'first' }], errors: null }),
      message: 'Invalid API key invalidation response',
    },
    {
      name: 'wrong key with matching count',
      result: response({ itemsInvalidated: [{ id: 'other', name: 'other' }], errors: [] }),
      message: 'Incomplete API key invalidation',
    },
    {
      name: 'extra result',
      result: response({
        itemsInvalidated: [
          { id: 'key-1', name: 'first' },
          { id: 'extra', name: 'extra' },
        ],
        errors: [],
      }),
      message: 'Incomplete API key invalidation',
    },
  ])('surfaces invalidation $name instead of logging success', async ({ result, message }) => {
    const harness = createHarness();
    harness.invalidate.mockResolvedValueOnce(result);
    const { auth, close, done } = await harness.start();
    await auth.getApiKeyForAdmin();
    await close();
    await expect(done).rejects.toThrow(message);
    expect(
      harness.dependencies.log.info.mock.calls.flat().some((text) => text.startsWith('Invalidated'))
    ).toBe(false);
  });

  it('detects a duplicate invalidation result even when the response count matches', async () => {
    const harness = createHarness();
    const { auth, close, done } = await harness.start();
    const { apiKey } = await auth.getApiKeyForAdmin();
    await auth.getApiKeyForViewer();
    harness.invalidate.mockResolvedValueOnce(
      response({ itemsInvalidated: [apiKey, apiKey], errors: [] })
    );
    await close();
    await expect(done).rejects.toThrow('missing IDs: key-2');
  });

  it('propagates invalidation transport failures', async () => {
    const harness = createHarness();
    const failure = new Error('invalidation request failed');
    harness.invalidate.mockRejectedValueOnce(failure);
    const { auth, close, done } = await harness.start();
    await auth.getApiKeyForAdmin();
    await close();
    await expect(done).rejects.toBe(failure);
  });

  it('preserves both use and cleanup errors when both fail', async () => {
    const harness = createHarness();
    const useFailure = new Error('use failed');
    const cleanupFailure = new Error('cleanup failed');
    harness.invalidate.mockRejectedValueOnce(cleanupFailure);
    const { done } = await harness.start(async (auth) => {
      await auth.getApiKeyForAdmin();
      throw useFailure;
    });
    await expect(done).rejects.toBeInstanceOf(AggregateError);
    await expect(done).rejects.toHaveProperty('errors', [useFailure, cleanupFailure]);
  });
});
