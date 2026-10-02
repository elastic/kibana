/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IClusterClient, KibanaRequest } from '@kbn/core/server';
import { CLOUD_SERVICE_ACCOUNT_REALM_TYPE } from '@kbn/core-security-common';
import type { CoreServiceAccountsService } from '@kbn/core-security-server';

import { scheduleForCaller } from './schedule_for_caller';

const serviceAccountRequest = {
  headers: { authorization: 'Bearer essu_token' },
} as unknown as KibanaRequest;

const authenticate = jest.fn();

const elasticsearch = {
  asScoped: () => ({
    asCurrentUser: { security: { authenticate } },
  }),
} as unknown as IClusterClient;

describe('scheduleForCaller', () => {
  const serviceAccounts = {
    isEnabled: jest.fn().mockReturnValue(true),
    getWorkloadBinding: jest.fn().mockResolvedValue(null),
    bindWorkload: jest.fn(),
  } as unknown as CoreServiceAccountsService;

  beforeEach(() => {
    authenticate.mockReset();
    jest.clearAllMocks();
  });

  it('stores the account id and does not clone an API key for an exchange bearer', async () => {
    authenticate.mockResolvedValue({
      username: 'account-id',
      authentication_realm: { type: CLOUD_SERVICE_ACCOUNT_REALM_TYPE },
    });
    const schedule = jest.fn().mockResolvedValue('scheduled');
    const task = { params: { workflowRunId: 'run-1', spaceId: 'default' } };

    await expect(
      scheduleForCaller({
        elasticsearch,
        serviceAccounts,
        request: serviceAccountRequest,
        executionId: 'execution-id',
        spaceId: 'default',
        taskInstance: task,
        schedule,
      })
    ).resolves.toBe('scheduled');

    expect(schedule).toHaveBeenCalledWith({
      params: { workflowRunId: 'run-1', spaceId: 'default', serviceAccountId: 'account-id' },
    });
    expect(serviceAccounts.bindWorkload).toHaveBeenCalledTimes(1);
  });

  it('clones the API key for any other caller', async () => {
    const schedule = jest.fn().mockResolvedValue('scheduled');
    const request = { headers: { authorization: 'ApiKey abc' } } as unknown as KibanaRequest;
    const task = { params: { workflowRunId: 'run-1' } };

    await scheduleForCaller({
      elasticsearch,
      serviceAccounts,
      request,
      executionId: 'execution-id',
      spaceId: 'default',
      taskInstance: task,
      schedule,
    });

    expect(schedule).toHaveBeenCalledWith(task, { request, cloneApiKey: true });
    expect(serviceAccounts.bindWorkload).not.toHaveBeenCalled();
  });
});
