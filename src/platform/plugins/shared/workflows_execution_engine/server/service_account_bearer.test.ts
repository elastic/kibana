/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { CLOUD_SERVICE_ACCOUNT_REALM_TYPE } from '@kbn/core-security-common';
import type { CoreServiceAccountsService } from '@kbn/core-security-server';

import {
  ensureServiceAccountBearerBinding,
  releaseServiceAccountBearerBinding,
  runServiceAccountBearer,
  SERVICE_ACCOUNT_BEARER_TYPE,
  serviceAccountIdFromExchangeBearer,
} from './service_account_bearer';

const serviceAccountRequest = {
  headers: { authorization: 'Bearer essu_token' },
} as unknown as KibanaRequest;

const authenticate = jest.fn();

const elasticsearch = {
  asScoped: () => ({
    asCurrentUser: { security: { authenticate } },
  }),
} as unknown as IClusterClient;

describe('serviceAccountIdFromExchangeBearer', () => {
  beforeEach(() => {
    authenticate.mockReset();
  });

  it('returns the username of a cloud service account bearer', async () => {
    authenticate.mockResolvedValue({
      username: 'TzA7lhusRY-VENvXfOcgoA',
      authentication_realm: { type: CLOUD_SERVICE_ACCOUNT_REALM_TYPE },
    });

    await expect(
      serviceAccountIdFromExchangeBearer(elasticsearch, serviceAccountRequest)
    ).resolves.toBe('TzA7lhusRY-VENvXfOcgoA');
  });

  it('returns undefined for an API key', async () => {
    await expect(
      serviceAccountIdFromExchangeBearer(elasticsearch, {
        headers: { authorization: 'ApiKey essu_key' },
      } as unknown as KibanaRequest)
    ).resolves.toBeUndefined();
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('returns undefined when the bearer is not a service account', async () => {
    authenticate.mockResolvedValue({
      username: 'user-12345',
      authentication_realm: { type: '_cloud_api_key' },
    });

    await expect(
      serviceAccountIdFromExchangeBearer(elasticsearch, serviceAccountRequest)
    ).resolves.toBeUndefined();
  });
});

describe('ensureServiceAccountBearerBinding', () => {
  const serviceAccounts = {
    isEnabled: jest.fn().mockReturnValue(true),
    getWorkloadBinding: jest.fn(),
    bindWorkload: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<CoreServiceAccountsService, 'isEnabled' | 'getWorkloadBinding' | 'bindWorkload'>
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    serviceAccounts.isEnabled.mockReturnValue(true);
  });

  it('does not rebind when the execution already names this account', async () => {
    serviceAccounts.getWorkloadBinding.mockResolvedValue({
      serviceAccountId: 'account-id',
    } as never);

    await ensureServiceAccountBearerBinding(
      serviceAccounts as unknown as CoreServiceAccountsService,
      serviceAccountRequest,
      'execution-id',
      'default',
      'account-id'
    );

    expect(serviceAccounts.getWorkloadBinding).toHaveBeenCalledWith({
      workloadType: SERVICE_ACCOUNT_BEARER_TYPE,
      workloadId: 'execution-id',
      spaceId: 'default',
    });
    expect(serviceAccounts.bindWorkload).not.toHaveBeenCalled();
  });

  it('binds the service account when the execution has no binding', async () => {
    serviceAccounts.getWorkloadBinding.mockResolvedValue(null);

    await ensureServiceAccountBearerBinding(
      serviceAccounts as unknown as CoreServiceAccountsService,
      serviceAccountRequest,
      'execution-id',
      'default',
      'account-id'
    );

    expect(serviceAccounts.bindWorkload).toHaveBeenCalledWith(serviceAccountRequest, {
      workloadType: SERVICE_ACCOUNT_BEARER_TYPE,
      workloadId: 'execution-id',
      serviceAccountId: 'account-id',
    });
  });

  it('rebinds when the execution names a different account', async () => {
    serviceAccounts.getWorkloadBinding.mockResolvedValue({
      serviceAccountId: 'other-account',
    } as never);

    await ensureServiceAccountBearerBinding(
      serviceAccounts as unknown as CoreServiceAccountsService,
      serviceAccountRequest,
      'execution-id',
      'default',
      'account-id'
    );

    expect(serviceAccounts.bindWorkload).toHaveBeenCalledWith(serviceAccountRequest, {
      workloadType: SERVICE_ACCOUNT_BEARER_TYPE,
      workloadId: 'execution-id',
      serviceAccountId: 'account-id',
    });
  });

  it('rejects when service account execution is disabled', async () => {
    serviceAccounts.isEnabled.mockReturnValue(false);

    await expect(
      ensureServiceAccountBearerBinding(
        serviceAccounts as unknown as CoreServiceAccountsService,
        serviceAccountRequest,
        'execution-id',
        'default',
        'account-id'
      )
    ).rejects.toThrow('Service account execution is disabled.');
    expect(serviceAccounts.bindWorkload).not.toHaveBeenCalled();
  });
});

describe('runServiceAccountBearer', () => {
  const serviceAccounts = {
    withScopedRequestForWorkload: jest.fn(
      async (_params, run: (request: KibanaRequest) => unknown) => run({} as KibanaRequest)
    ),
  } as unknown as CoreServiceAccountsService;

  it('exchanges the service account bearer binding for this execution', async () => {
    const run = jest.fn().mockResolvedValue('ran');

    await expect(
      runServiceAccountBearer({
        serviceAccountId: 'account-id',
        serviceAccounts,
        spaceId: 'default',
        executionId: 'execution-id',
        run,
      })
    ).resolves.toBe('ran');

    expect(serviceAccounts.withScopedRequestForWorkload).toHaveBeenCalledWith(
      {
        workloadType: SERVICE_ACCOUNT_BEARER_TYPE,
        workloadId: 'execution-id',
        spaceId: 'default',
        expectedServiceAccountId: 'account-id',
      },
      run
    );
  });
});

describe('releaseServiceAccountBearerBinding', () => {
  const logger = { warn: jest.fn() } as unknown as Logger;
  const unbindWorkload = jest.fn().mockResolvedValue(true);
  const serviceAccounts = {
    isEnabled: jest.fn().mockReturnValue(true),
    unbindWorkload,
    withScopedRequestForWorkload: jest.fn(
      async (_params: unknown, run: (request: KibanaRequest) => unknown) =>
        run(serviceAccountRequest)
    ),
  } as unknown as CoreServiceAccountsService;

  beforeEach(() => {
    jest.clearAllMocks();
    (serviceAccounts.isEnabled as jest.Mock).mockReturnValue(true);
    (serviceAccounts.withScopedRequestForWorkload as jest.Mock).mockImplementation(
      async (_params: unknown, run: (request: KibanaRequest) => unknown) =>
        run(serviceAccountRequest)
    );
  });

  it('unbinds this execution', async () => {
    await releaseServiceAccountBearerBinding({
      serviceAccounts,
      spaceId: 'default',
      executionId: 'execution-id',
      serviceAccountId: 'account-id',
      logger,
    });

    expect(serviceAccounts.unbindWorkload).toHaveBeenCalledWith(serviceAccountRequest, {
      workloadType: SERVICE_ACCOUNT_BEARER_TYPE,
      workloadId: 'execution-id',
    });
  });

  it('does nothing when service accounts are disabled', async () => {
    (serviceAccounts.isEnabled as jest.Mock).mockReturnValue(false);

    await releaseServiceAccountBearerBinding({
      serviceAccounts,
      spaceId: 'default',
      executionId: 'execution-id',
      serviceAccountId: 'account-id',
      logger,
    });

    expect(serviceAccounts.withScopedRequestForWorkload).not.toHaveBeenCalled();
  });

  it('does not warn when the binding is already gone', async () => {
    (serviceAccounts.withScopedRequestForWorkload as jest.Mock).mockRejectedValue(
      Boom.notFound('The workload has no service account binding.')
    );

    await releaseServiceAccountBearerBinding({
      serviceAccounts,
      spaceId: 'default',
      executionId: 'execution-id',
      serviceAccountId: 'account-id',
      logger,
    });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs and does not throw when the binding cannot be removed', async () => {
    (serviceAccounts.withScopedRequestForWorkload as jest.Mock).mockRejectedValue(
      new Error('store unavailable')
    );

    await expect(
      releaseServiceAccountBearerBinding({
        serviceAccounts,
        spaceId: 'default',
        executionId: 'execution-id',
        serviceAccountId: 'account-id',
        logger,
      })
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('execution-id'));
  });
});
