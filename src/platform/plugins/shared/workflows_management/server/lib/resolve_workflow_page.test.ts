/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { resolveWorkflowPage } from './resolve_workflow_page';
import { pageDefinition, pageRef, WORKFLOW_CREATED_AT } from '../pages/fake_page_store.mock';
import type { WorkflowPageRef } from '../pages/page_secret';
import type { WorkflowPageMissReason } from '../pages/types';
import type { VerifyPageSecretResult } from '../pages/workflow_pages_system_client';
import type { WorkflowProperties } from '../storage/workflow_storage';

const boundPageDefinition = (pageId?: string) => ({
  ...pageDefinition(pageId),
  settings: { run_as: 'service-account-1' },
});

const setup = (
  overrides: Partial<WorkflowProperties> | null = {},
  { bindingsEnabled = true, boundAccountId = 'service-account-1' as string | null } = {}
) => {
  const workflow =
    overrides === null
      ? null
      : ({
          enabled: true,
          valid: true,
          created_at: WORKFLOW_CREATED_AT,
          definition: boundPageDefinition(),
          ...overrides,
        } as WorkflowProperties);
  const getWorkflowSource = jest.fn(async () => workflow);
  const pagesSystemClient = {
    verifyPageSecret: jest.fn(
      async (): Promise<VerifyPageSecretResult> => ({ workflowCreatedAt: WORKFLOW_CREATED_AT })
    ),
  };
  const serviceAccountBindings = {
    isEnabled: jest.fn(() => bindingsEnabled),
    getWorkloadBinding: jest.fn(async () =>
      boundAccountId === null
        ? null
        : {
            pluginId: 'workflowsExecutionEngine',
            workloadType: 'workflow',
            workloadId: pageRef.workflowId,
            spaceId: pageRef.spaceId,
            serviceAccountId: boundAccountId,
            boundBy: { type: 'user' as const, username: 'admin' },
            boundAt: WORKFLOW_CREATED_AT,
          }
    ),
  };
  const resolve = (ref: WorkflowPageRef, secret: string) =>
    resolveWorkflowPage(
      { getWorkflowSource, pagesSystemClient, serviceAccountBindings },
      { ref, secret }
    );
  return { resolve, workflow, getWorkflowSource, pagesSystemClient, serviceAccountBindings };
};

describe('resolveWorkflowPage', () => {
  it('returns the workflow when every check passes', async () => {
    const { resolve, workflow, getWorkflowSource, pagesSystemClient } = setup();

    await expect(resolve(pageRef, 'the-secret')).resolves.toEqual({ workflow });
    expect(pagesSystemClient.verifyPageSecret).toHaveBeenCalledWith(pageRef, 'the-secret');
    expect(getWorkflowSource).toHaveBeenCalledWith(pageRef.workflowId, pageRef.spaceId);
  });

  it.each(['page_not_found', 'page_offline', 'secret_mismatch'] as const)(
    'returns %s from the page check, before it reads the workflow',
    async (reason) => {
      const { resolve, getWorkflowSource, pagesSystemClient, serviceAccountBindings } = setup();
      pagesSystemClient.verifyPageSecret.mockResolvedValue({ reason });

      await expect(resolve(pageRef, 'wrong')).resolves.toEqual({ reason });
      expect(getWorkflowSource).not.toHaveBeenCalled();
      expect(serviceAccountBindings.getWorkloadBinding).not.toHaveBeenCalled();
    }
  );

  it('returns workflow_not_found when the workflow is missing, deleted, or global', async () => {
    const { resolve } = setup(null);
    await expect(resolve(pageRef, 'the-secret')).resolves.toEqual({
      reason: 'workflow_not_found',
    });
  });

  it.each<[WorkflowPageMissReason, Partial<WorkflowProperties>]>([
    ['stale_page', { created_at: '2026-02-01T00:00:00.000Z' }],
    ['workflow_disabled', { enabled: false }],
    ['workflow_invalid', { valid: false }],
    ['trigger_missing', { definition: boundPageDefinition('other-page') }],
    ['not_bound', { definition: pageDefinition() }],
  ])('returns %s with the right secret', async (reason, overrides) => {
    const { resolve } = setup(overrides);
    await expect(resolve(pageRef, 'the-secret')).resolves.toEqual({ reason });
  });

  it('reads the binding of the workflow in its space', async () => {
    const { resolve, serviceAccountBindings } = setup();

    await resolve(pageRef, 'the-secret');

    expect(serviceAccountBindings.getWorkloadBinding).toHaveBeenCalledWith({
      workloadType: 'workflow',
      workloadId: pageRef.workflowId,
      spaceId: pageRef.spaceId,
    });
  });

  it.each([
    ['service account execution is off', { bindingsEnabled: false }],
    ['the workflow has no binding', { boundAccountId: null }],
    ['the binding names another account', { boundAccountId: 'service-account-2' }],
  ])('returns not_bound when %s', async (_, bindingState) => {
    const { resolve } = setup({}, bindingState);
    await expect(resolve(pageRef, 'the-secret')).resolves.toEqual({ reason: 'not_bound' });
  });

  it('never resolves a page in the global space', async () => {
    const { resolve, pagesSystemClient } = setup();

    await expect(
      resolve({ ...pageRef, spaceId: GLOBAL_WORKFLOW_SPACE_ID }, 'the-secret')
    ).resolves.toEqual({ reason: 'global_space' });
    expect(pagesSystemClient.verifyPageSecret).not.toHaveBeenCalled();
  });
});
