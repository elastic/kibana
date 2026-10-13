/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, securityServiceMock } from '@kbn/core/server/mocks';
import type { EsWorkflow } from '@kbn/workflows';
import { ensureFailureHandlerIdentity } from './ensure_failure_handler_identity';

describe('ensureFailureHandlerIdentity', () => {
  const current: EsWorkflow = {
    id: 'handler',
    name: 'Handler',
    enabled: true,
    yaml: '',
    valid: true,
    tags: [],
    createdAt: new Date(),
    lastUpdatedAt: new Date(),
    createdBy: 'owner',
    lastUpdatedBy: 'owner',
    deleted_at: null,
    definition: {
      version: '1',
      name: 'Handler',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [],
      settings: { run_as: 'handler-sa' },
    },
  };
  const core = { ...coreMock.createStart(), security: securityServiceMock.createStart() };
  beforeEach(() => {
    jest.clearAllMocks();
    core.security.serviceAccounts.isEnabled.mockReturnValue(true);
    core.security.serviceAccounts.getWorkloadBinding.mockResolvedValue({
      serviceAccountId: 'handler-sa',
      pluginId: 'workflowsExecutionEngine',
      workloadType: 'workflow',
      workloadId: 'handler',
      spaceId: 'source-space',
      boundBy: { type: 'user', username: 'owner' },
      boundAt: new Date().toISOString(),
    });
  });

  it('admits only the handler binding in the persisted failure space', async () => {
    await expect(
      ensureFailureHandlerIdentity(core, current, current, 'source-space')
    ).resolves.toBeUndefined();
    expect(core.security.serviceAccounts.getWorkloadBinding).toHaveBeenCalledWith({
      workloadType: 'workflow',
      workloadId: 'handler',
      spaceId: 'source-space',
    });
  });

  it.each<Partial<EsWorkflow> | undefined>([
    undefined,
    { enabled: false },
    { deleted_at: new Date() },
    { definition: undefined },
    { owner_id: 'owner', access_control: { access_mode: 'private', entries: [] } },
  ])('rejects unavailable or inaccessible saved handlers: %j', async (overrides) => {
    await expect(
      ensureFailureHandlerIdentity(
        core,
        current,
        overrides ? { ...current, ...overrides } : undefined,
        'source-space'
      )
    ).rejects.toThrow('own enabled service account binding');
    expect(core.security.serviceAccounts.getWorkloadBinding).not.toHaveBeenCalled();
  });

  it('rejects unbound and ephemeral handlers', async () => {
    await expect(
      ensureFailureHandlerIdentity(
        core,
        { ...current, definition: undefined },
        current,
        'source-space'
      )
    ).rejects.toThrow('own enabled service account binding');
    await expect(
      ensureFailureHandlerIdentity(core, { ...current, isEphemeral: true }, current, 'source-space')
    ).rejects.toThrow('own enabled service account binding');
  });

  it('rejects disabled service accounts and missing or changed bindings', async () => {
    core.security.serviceAccounts.isEnabled.mockReturnValue(false);
    await expect(
      ensureFailureHandlerIdentity(core, current, current, 'source-space')
    ).rejects.toThrow('own enabled service account binding');
    core.security.serviceAccounts.isEnabled.mockReturnValue(true);
    core.security.serviceAccounts.getWorkloadBinding.mockResolvedValue(null);
    await expect(
      ensureFailureHandlerIdentity(core, current, current, 'source-space')
    ).rejects.toThrow('binding has changed');
    core.security.serviceAccounts.getWorkloadBinding.mockResolvedValue({
      serviceAccountId: 'source-sa',
      pluginId: 'workflowsExecutionEngine',
      workloadType: 'workflow',
      workloadId: 'handler',
      spaceId: 'source-space',
      boundBy: { type: 'user', username: 'owner' },
      boundAt: new Date().toISOString(),
    });
    await expect(
      ensureFailureHandlerIdentity(core, current, current, 'source-space')
    ).rejects.toThrow('binding has changed');
  });
});
