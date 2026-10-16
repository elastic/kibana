/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, httpServerMock, securityServiceMock } from '@kbn/core/server/mocks';
import type {
  EsWorkflowExecution,
  WorkflowExecuteStep,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import {
  ensureInheritedBindingCurrent,
  getWorkflowOriginalRequest,
  resolveInheritedWorkflowIdentity,
  withWorkflowExecutionIdentity,
} from './service_account_execution';

const child = {
  id: 'child',
  managed: true,
  name: 'Child',
  enabled: true,
  isTestRun: false,
  yaml: 'name: Child\nenabled: true\n',
  definition: {
    name: 'Child',
    version: '1',
    enabled: true,
    triggers: [{ type: 'manual' }],
    steps: [],
  },
} satisfies WorkflowExecutionEngineModel;
const approval: WorkflowExecuteStep['with'] = {
  'workflow-id': child.id,
  'run-as-mode': 'inherit',
};
const parent = (
  withInput = approval,
  accountId: string | undefined = 'account-a'
): Pick<
  EsWorkflowExecution,
  'id' | 'workflowId' | 'spaceId' | 'workflowDefinition' | 'effectiveIdentity' | 'managed'
> => ({
  id: 'parent-execution',
  managed: true,
  workflowId: 'parent',
  spaceId: 'default',
  workflowDefinition: {
    name: 'Parent',
    version: '1' as const,
    enabled: true,
    triggers: [{ type: 'manual' as const }],
    settings: accountId ? { run_as: accountId } : undefined,
    steps: [{ name: 'child', type: 'workflow.execute' as const, with: withInput }],
  },
});
const context = {
  inheritParentIdentity: true,
  parentWorkflowId: 'parent',
  parentWorkflowExecutionId: 'parent-execution',
  parentStepId: 'child',
  spaceId: 'default',
};
const identity: NonNullable<EsWorkflowExecution['effectiveIdentity']> = {
  type: 'service_account',
  id: 'account-a',
  inheritedFrom: {
    workloadId: 'parent',
  },
};

describe('inherited workflow execution identity', () => {
  const core = { ...coreMock.createStart(), security: securityServiceMock.createStart() };
  const caller = httpServerMock.createKibanaRequest();
  beforeEach(() => {
    jest.clearAllMocks();
    core.security.serviceAccounts.isEnabled.mockReturnValue(true);
    core.security.serviceAccounts.withScopedRequestForWorkload.mockImplementation(
      async (_params, run) => run(httpServerMock.createKibanaRequest())
    );
  });

  it('does not inherit by default, even inside an SA execution', async () => {
    await withWorkflowExecutionIdentity(core, parent(), caller, async (request) => {
      expect(
        resolveInheritedWorkflowIdentity(request, child, {
          ...context,
          inheritParentIdentity: false,
        })
      ).toBeUndefined();
      expect(getWorkflowOriginalRequest(request)).toBe(caller);
    });
  });

  it.each(['workflow.execute', 'workflow.executeAsync'] as const)(
    'resolves a managed %s child from the protected parent identity choice',
    async (type) => {
      const execution = parent();
      execution.workflowDefinition.steps = [{ name: 'child', type, with: approval }];
      await withWorkflowExecutionIdentity(core, execution, caller, async (request) => {
        expect(resolveInheritedWorkflowIdentity(request, child, context)).toEqual(identity);
      });
    }
  );

  it('does not trust invocation context without a live SA-scoped parent request', () => {
    expect(() => resolveInheritedWorkflowIdentity(caller, child, context)).toThrow(
      'requires a parent executing as a service account'
    );
  });

  it('removes delegation authority when the parent callback finishes', async () => {
    const request = await withWorkflowExecutionIdentity(
      core,
      parent(),
      caller,
      async (scoped) => scoped
    );
    expect(() => resolveInheritedWorkflowIdentity(request, child, context)).toThrow(
      'requires a parent executing as a service account'
    );
  });

  it.each([
    { parentWorkflowId: 'other' },
    { parentWorkflowExecutionId: 'other' },
    { spaceId: 'other' },
  ])('rejects a forged parent or cross-space invocation: %j', async (override) => {
    await withWorkflowExecutionIdentity(core, parent(), caller, async (request) => {
      expect(() =>
        resolveInheritedWorkflowIdentity(request, child, { ...context, ...override })
      ).toThrow('calling workflow in the same space');
    });
  });

  it.each([
    { ...approval, 'run-as-mode': 'default' as const },
    { 'workflow-id': child.id },
    { ...approval, 'workflow-id': '{{ inputs.child }}' },
    { 'workflow-id': child.id, inheritRunAs: true },
  ])('rejects missing, unsupported, or dynamic identity choices: %j', async (withInput) => {
    await withWorkflowExecutionIdentity(core, parent(withInput), caller, async (request) => {
      expect(() => resolveInheritedWorkflowIdentity(request, child, context)).toThrow(
        'literal workflow-id and identity choice'
      );
    });
  });

  it.each([false, undefined])('rejects unmanaged children (%s)', async (managed) => {
    await withWorkflowExecutionIdentity(core, parent(), caller, async (request) => {
      expect(() =>
        resolveInheritedWorkflowIdentity(request, { ...child, managed }, context)
      ).toThrow('Only managed child workflows');
    });
  });

  it('uses the latest managed definition without revision approval', async () => {
    await withWorkflowExecutionIdentity(core, parent(), caller, async (request) => {
      const yaml = `${child.yaml}description: Updated by owning plugin\n`;
      expect(resolveInheritedWorkflowIdentity(request, { ...child, yaml }, context)).toEqual(
        identity
      );
    });
  });

  it('requires explicit override when the child has its own service account', async () => {
    const boundChild = {
      ...child,
      definition: { ...child.definition, settings: { run_as: 'child-account' } },
    };
    await withWorkflowExecutionIdentity(core, parent(), caller, async (request) => {
      expect(() => resolveInheritedWorkflowIdentity(request, boundChild, context)).toThrow(
        'run-as-mode: override'
      );
    });
    await withWorkflowExecutionIdentity(
      core,
      parent({ 'workflow-id': child.id, 'run-as-mode': 'override' }),
      caller,
      async (request) => {
        expect(resolveInheritedWorkflowIdentity(request, boundChild, context)).toEqual(identity);
        expect(boundChild.definition.settings.run_as).toBe('child-account');
      }
    );
  });

  it('checks managed eligibility at every inherited hop', async () => {
    const inheritedParent = { ...parent(), effectiveIdentity: identity };
    await withWorkflowExecutionIdentity(core, inheritedParent, caller, async (request) => {
      expect(() =>
        resolveInheritedWorkflowIdentity(request, { ...child, managed: false }, context)
      ).toThrow('Only managed child workflows');
    });
  });

  it('remints from the root binding after the parent has finished and retains original caller credentials', async () => {
    const inherited = await withWorkflowExecutionIdentity(core, parent(), caller, async (request) =>
      resolveInheritedWorkflowIdentity(request, child, context)
    );
    const execution = {
      ...parent(),
      workflowId: child.id,
      workflowDefinition: child.definition,
      effectiveIdentity: inherited,
    };
    for (let resume = 0; resume < 2; resume++) {
      await withWorkflowExecutionIdentity(core, execution, caller, async (request) => {
        expect(getWorkflowOriginalRequest(request)).toBe(caller);
      });
    }
    expect(core.security.serviceAccounts.withScopedRequestForWorkload).toHaveBeenLastCalledWith(
      {
        workloadType: 'workflow',
        workloadId: 'parent',
        spaceId: 'default',
        expectedServiceAccountId: 'account-a',
        executionId: 'parent-execution',
      },
      expect.any(Function)
    );
    expect(core.security.serviceAccounts.withScopedRequestForWorkload).toHaveBeenCalledTimes(3);
  });

  it('retains the root workload binding across a further inherited child', async () => {
    const inheritedParent = {
      ...parent(),
      effectiveIdentity: {
        ...identity,
        inheritedFrom: {
          workloadId: 'root',
        },
      },
    };
    await withWorkflowExecutionIdentity(core, inheritedParent, caller, async (request) => {
      expect(resolveInheritedWorkflowIdentity(request, child, context)?.inheritedFrom).toEqual({
        ...identity.inheritedFrom,
        workloadId: 'root',
      });
    });
  });

  it.each([false, undefined])(
    'rejects an unmanaged parent at the identity boundary (%s)',
    async (managed) => {
      await withWorkflowExecutionIdentity(
        core,
        { ...parent(), managed },
        caller,
        async (request) => {
          expect(() => resolveInheritedWorkflowIdentity(request, child, context)).toThrow(
            'Only managed parent'
          );
        }
      );
    }
  );

  it.each(['workflow.execute', 'workflow.executeAsync'] as const)(
    'accepts a saved workflow-level fallback choice for %s with a generated runtime ID',
    async (type) => {
      const fallbackStep = { name: 'child', type, with: approval };
      const execution = parent();
      execution.workflowDefinition = {
        ...execution.workflowDefinition,
        steps: [],
        settings: {
          run_as: 'account-a',
          'on-failure': { fallback: [fallbackStep] },
        },
      };
      await withWorkflowExecutionIdentity(core, execution, caller, async (request) => {
        expect(
          resolveInheritedWorkflowIdentity(request, child, {
            ...context,
            parentStepId: 'workflow-level-on-failure_fail_child',
            parentStepName: 'child',
          })
        ).toEqual(identity);
      });
    }
  );

  it('checks the inherited root binding before persistence', async () => {
    const binding = {
      pluginId: 'workflows',
      workloadType: 'workflow',
      workloadId: 'root',
      spaceId: 'default',
      serviceAccountId: 'account-a',
      boundBy: { type: 'service_account' as const, serviceAccountId: 'account-a' },
      boundAt: '2026-10-07T00:00:00.000Z',
    };
    const rootIdentity = {
      ...identity,
      inheritedFrom: {
        workloadId: 'root',
      },
    };
    core.security.serviceAccounts.getWorkloadBinding.mockResolvedValue(binding);
    await ensureInheritedBindingCurrent(core, rootIdentity, 'default');
    expect(core.security.serviceAccounts.getWorkloadBinding).toHaveBeenCalledWith({
      workloadType: 'workflow',
      workloadId: 'root',
      spaceId: 'default',
    });
    core.security.serviceAccounts.getWorkloadBinding.mockResolvedValue({
      ...binding,
      serviceAccountId: 'other',
    });
    await expect(ensureInheritedBindingCurrent(core, rootIdentity, 'default')).rejects.toThrow(
      'binding has changed'
    );
    core.security.serviceAccounts.getWorkloadBinding.mockResolvedValue(null);
    await expect(ensureInheritedBindingCurrent(core, rootIdentity, 'default')).rejects.toThrow(
      'binding has changed'
    );
    core.security.serviceAccounts.isEnabled.mockReturnValue(false);
    await expect(ensureInheritedBindingCurrent(core, rootIdentity, 'default')).rejects.toThrow(
      'disabled'
    );
  });

  it('never falls back to the caller after revocation or feature disablement', async () => {
    const execution = {
      ...parent(),
      workflowDefinition: child.definition,
      effectiveIdentity: identity,
    };
    const run = jest.fn();
    core.security.serviceAccounts.withScopedRequestForWorkload.mockRejectedValue(
      new Error('Binding revoked')
    );
    await expect(withWorkflowExecutionIdentity(core, execution, caller, run)).rejects.toThrow(
      'Binding revoked'
    );
    core.security.serviceAccounts.isEnabled.mockReturnValue(false);
    await expect(withWorkflowExecutionIdentity(core, execution, caller, run)).rejects.toThrow(
      'disabled'
    );
    expect(run).not.toHaveBeenCalled();
  });
});
