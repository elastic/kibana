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
  const pagesSystemClient = { verifyPageSecret: jest.fn(async () => true) };
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

    await expect(resolve(pageRef, 'the-secret')).resolves.toBe(workflow);
    expect(getWorkflowSource).toHaveBeenCalledWith(pageRef.workflowId, pageRef.spaceId);
    expect(pagesSystemClient.verifyPageSecret).toHaveBeenCalledWith(
      pageRef,
      'the-secret',
      WORKFLOW_CREATED_AT
    );
  });

  it.each<[string, Partial<WorkflowProperties> | null]>([
    ['the workflow is missing, deleted, or global', null],
    ['the workflow is disabled', { enabled: false }],
    ['the workflow is invalid', { valid: false }],
    ['the workflow has no service account', { definition: pageDefinition() }],
    ['the page trigger is gone', { definition: boundPageDefinition('other-page') }],
  ])('returns undefined when %s, without a secret check', async (_, overrides) => {
    const { resolve, pagesSystemClient } = setup(overrides);

    await expect(resolve(pageRef, 'the-secret')).resolves.toBeUndefined();
    expect(pagesSystemClient.verifyPageSecret).not.toHaveBeenCalled();
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
  ])('returns undefined when %s, without a secret check', async (_, bindingState) => {
    const { resolve, pagesSystemClient } = setup({}, bindingState);

    await expect(resolve(pageRef, 'the-secret')).resolves.toBeUndefined();
    expect(pagesSystemClient.verifyPageSecret).not.toHaveBeenCalled();
  });

  it('returns undefined when the page rejects the secret', async () => {
    const { resolve, pagesSystemClient } = setup();
    pagesSystemClient.verifyPageSecret.mockResolvedValue(false);

    await expect(resolve(pageRef, 'wrong')).resolves.toBeUndefined();
  });

  it('never resolves a page in the global space', async () => {
    const { resolve, getWorkflowSource } = setup();

    await expect(
      resolve({ ...pageRef, spaceId: GLOBAL_WORKFLOW_SPACE_ID }, 'the-secret')
    ).resolves.toBeUndefined();
    expect(getWorkflowSource).not.toHaveBeenCalled();
  });
});
