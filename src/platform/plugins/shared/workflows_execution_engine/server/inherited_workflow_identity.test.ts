/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { coreMock, httpServerMock, securityServiceMock } from '@kbn/core/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import type {
  EsWorkflowExecution,
  WorkflowExecuteStep,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import {
  ensureInheritedBindingCurrent,
  getWorkflowTaskRunAs,
  resolveInheritedEventWorkflowIdentity,
  resolveInheritedWorkflowIdentity,
  withWorkflowExecutionIdentity,
} from './service_account_execution';
import { EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER } from './trigger_events/event_context/event_chain_context';

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
  const runAs: NonNullable<RunContext['runAs']> = { withScopedRequest: jest.fn() };
  beforeEach(() => {
    jest.clearAllMocks();
    core.security.serviceAccounts.isEnabled.mockReturnValue(true);
    jest
      .mocked(runAs.withScopedRequest)
      .mockImplementation(async (run) => run(httpServerMock.createKibanaRequest()));
  });

  describe('event subscribers', () => {
    const getExecution = jest.fn<Promise<ReturnType<typeof parent> | null>, [string, string]>();
    const resolveEvent = (
      request: KibanaRequest,
      workflow: WorkflowExecutionEngineModel = child,
      spaceId = 'default'
    ) =>
      resolveInheritedEventWorkflowIdentity(request, workflow, spaceId, {
        security: core.security,
        getExecution,
      });

    beforeEach(() => {
      getExecution.mockReset().mockResolvedValue(null);
      core.security.authc.getPrincipal.mockReturnValue(null);
    });

    it('inherits from the emitting managed workflow without a child-call step', async () => {
      await withWorkflowExecutionIdentity(
        core,
        parent(),
        caller,
        async (request) => {
          await expect(resolveEvent(request)).resolves.toEqual(identity);
        },
        runAs
      );
    });

    it('retains the root binding across an inherited emitter', async () => {
      await withWorkflowExecutionIdentity(
        core,
        {
          ...parent(),
          effectiveIdentity: { ...identity, inheritedFrom: { workloadId: 'root' } },
        },
        caller,
        async (request) => {
          await expect(resolveEvent(request)).resolves.toEqual({
            ...identity,
            inheritedFrom: { workloadId: 'root' },
          });
        },
        runAs
      );
    });

    it.each([
      { managedEmitter: false, managedSubscriber: true },
      { managedEmitter: true, managedSubscriber: false },
    ])(
      'rejects unbound subscriptions for $managedEmitter/$managedSubscriber',
      async ({ managedEmitter, managedSubscriber }) => {
        await withWorkflowExecutionIdentity(
          core,
          { ...parent(), managed: managedEmitter },
          caller,
          async (request) => {
            await expect(
              resolveEvent(request, { ...child, managed: managedSubscriber })
            ).rejects.toThrow('must have its own service account');
          },
          runAs
        );
      }
    );

    it('does not inherit across spaces', async () => {
      await withWorkflowExecutionIdentity(
        core,
        parent(),
        caller,
        async (request) => {
          await expect(resolveEvent(request, child, 'other')).rejects.toThrow(
            'emitting workflow space'
          );
        },
        runAs
      );
    });

    it('keeps the subscriber own account even for unmanaged workflows', async () => {
      await withWorkflowExecutionIdentity(
        core,
        { ...parent(), managed: false },
        caller,
        async (request) => {
          await expect(
            resolveEvent(request, {
              ...child,
              managed: false,
              definition: { ...child.definition, settings: { run_as: 'subscriber-account' } },
            })
          ).resolves.toBeUndefined();
        },
        runAs
      );
    });

    it('keeps ordinary caller scheduling and does not infer identity from headers', async () => {
      await expect(resolveEvent(caller)).resolves.toBeUndefined();
      await expect(
        resolveEvent(
          httpServerMock.createKibanaRequest({
            headers: {
              authorization: 'Bearer untrusted',
              [EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER]: 'parent-execution',
            },
          })
        )
      ).resolves.toBeUndefined();
      expect(getExecution).not.toHaveBeenCalled();
    });

    describe('HTTP route emitters', () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { [EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER]: 'parent-execution' },
      });
      beforeEach(() => {
        core.security.authc.getPrincipal.mockReturnValue({
          type: 'service_account',
          serviceAccountId: 'account-a',
          variant: 'stack',
        });
        getExecution.mockResolvedValue(parent());
      });

      it('recovers the authenticated emitter and retains its root binding', async () => {
        getExecution.mockResolvedValue({
          ...parent(),
          effectiveIdentity: { ...identity, inheritedFrom: { workloadId: 'root' } },
        });
        await expect(resolveEvent(request)).resolves.toEqual({
          ...identity,
          inheritedFrom: { workloadId: 'root' },
        });
        expect(getExecution).toHaveBeenCalledWith('parent-execution', 'default');
      });

      it.each([
        [
          'different account',
          {
            ...parent(),
            workflowDefinition: {
              ...parent().workflowDefinition,
              settings: { run_as: 'account-b' },
            },
          },
        ],
        ['unmanaged emitter', { ...parent(), managed: false }],
        ['different space', { ...parent(), spaceId: 'other' }],
        ['missing emitter', null],
      ] as const)('rejects %s', async (_label, execution) => {
        getExecution.mockResolvedValue(execution);
        await expect(resolveEvent(request)).rejects.toThrow();
      });

      it('rejects an external SA event with no emitter before scheduling', async () => {
        await expect(resolveEvent(caller)).rejects.toThrow('matching managed workflow emitter');
        expect(getExecution).not.toHaveBeenCalled();
      });

      it('allows an external SA event to schedule an independently bound subscriber', async () => {
        await expect(
          resolveEvent(caller, {
            ...child,
            definition: { ...child.definition, settings: { run_as: 'own-account' } },
          })
        ).resolves.toBeUndefined();
        expect(getExecution).not.toHaveBeenCalled();
      });
    });
  });

  it('inherits by default inside an SA execution', async () => {
    await withWorkflowExecutionIdentity(
      core,
      parent(),
      caller,
      async (request) => {
        expect(
          resolveInheritedWorkflowIdentity(request, child, {
            ...context,
            inheritParentIdentity: false,
          })
        ).toEqual(identity);
      },
      runAs
    );
  });

  it.each([undefined, 'default'] as const)(
    'follows the SA for an unbound child with mode %s',
    async (mode) => {
      await withWorkflowExecutionIdentity(
        core,
        parent({ 'workflow-id': child.id, 'run-as-mode': mode }),
        caller,
        async (request) => {
          expect(
            resolveInheritedWorkflowIdentity(request, child, {
              ...context,
              inheritParentIdentity: false,
            })
          ).toEqual(identity);
          expect(
            resolveInheritedWorkflowIdentity(
              request,
              {
                ...child,
                definition: { ...child.definition, settings: { run_as: 'child-account' } },
              },
              { ...context, inheritParentIdentity: false }
            )
          ).toBeUndefined();
          expect(() =>
            resolveInheritedWorkflowIdentity(
              request,
              { ...child, managed: false },
              { ...context, inheritParentIdentity: false }
            )
          ).toThrow('Only managed child workflows');
        },
        runAs
      );
    }
  );

  it('does not treat the obsolete inheritRunAs flag as explicit delegation', async () => {
    const withInput = { 'workflow-id': child.id, inheritRunAs: true };
    await withWorkflowExecutionIdentity(
      core,
      parent(withInput),
      caller,
      async (request) => {
        const boundChild = {
          ...child,
          definition: { ...child.definition, settings: { run_as: 'child-account' } },
        };
        expect(() => resolveInheritedWorkflowIdentity(request, boundChild, context)).toThrow(
          'literal workflow-id and identity choice'
        );
      },
      runAs
    );
  });

  it.each(['workflow.execute', 'workflow.executeAsync'] as const)(
    'resolves a managed %s child from the protected parent identity choice',
    async (type) => {
      const execution = parent();
      execution.workflowDefinition.steps = [{ name: 'child', type, with: approval }];
      await withWorkflowExecutionIdentity(
        core,
        execution,
        caller,
        async (request) => {
          expect(resolveInheritedWorkflowIdentity(request, child, context)).toEqual(identity);
        },
        runAs
      );
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
      async (scoped) => scoped,
      runAs
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
    await withWorkflowExecutionIdentity(
      core,
      parent(),
      caller,
      async (request) => {
        expect(() =>
          resolveInheritedWorkflowIdentity(request, child, { ...context, ...override })
        ).toThrow('calling workflow in the same space');
      },
      runAs
    );
  });

  it.each([
    { ...approval, 'workflow-id': '{{ inputs.child }}' },
    { ...approval, 'workflow-id': 'not-the-resolved-child' },
  ])('rejects missing, unsupported, or dynamic identity choices: %j', async (withInput) => {
    await withWorkflowExecutionIdentity(
      core,
      parent(withInput),
      caller,
      async (request) => {
        expect(() => resolveInheritedWorkflowIdentity(request, child, context)).toThrow(
          'literal workflow-id and identity choice'
        );
      },
      runAs
    );
  });

  it.each([false, undefined])('rejects unmanaged children (%s)', async (managed) => {
    await withWorkflowExecutionIdentity(
      core,
      parent(),
      caller,
      async (request) => {
        expect(() =>
          resolveInheritedWorkflowIdentity(request, { ...child, managed }, context)
        ).toThrow('Only managed child workflows');
      },
      runAs
    );
  });

  it('uses the latest managed definition without revision approval', async () => {
    await withWorkflowExecutionIdentity(
      core,
      parent(),
      caller,
      async (request) => {
        const yaml = `${child.yaml}description: Updated by owning plugin\n`;
        expect(resolveInheritedWorkflowIdentity(request, { ...child, yaml }, context)).toEqual(
          identity
        );
      },
      runAs
    );
  });

  it('requires explicit override when the child has its own service account', async () => {
    const boundChild = {
      ...child,
      definition: { ...child.definition, settings: { run_as: 'child-account' } },
    };
    await withWorkflowExecutionIdentity(
      core,
      parent(),
      caller,
      async (request) => {
        expect(() => resolveInheritedWorkflowIdentity(request, boundChild, context)).toThrow(
          'run-as-mode: override'
        );
      },
      runAs
    );
    await withWorkflowExecutionIdentity(
      core,
      parent({ 'workflow-id': child.id, 'run-as-mode': 'override' }),
      caller,
      async (request) => {
        expect(resolveInheritedWorkflowIdentity(request, boundChild, context)).toEqual(identity);
        expect(boundChild.definition.settings.run_as).toBe('child-account');
      },
      runAs
    );
  });

  it('checks managed eligibility at every inherited hop', async () => {
    const inheritedParent = { ...parent(), effectiveIdentity: identity };
    await withWorkflowExecutionIdentity(
      core,
      inheritedParent,
      caller,
      async (request) => {
        expect(() =>
          resolveInheritedWorkflowIdentity(request, { ...child, managed: false }, context)
        ).toThrow('Only managed child workflows');
      },
      runAs
    );
  });

  it('remints from the root binding after the parent has finished', async () => {
    const inherited = await withWorkflowExecutionIdentity(
      core,
      parent(),
      caller,
      async (request) => resolveInheritedWorkflowIdentity(request, child, context),
      runAs
    );
    const execution = {
      ...parent(),
      workflowId: child.id,
      workflowDefinition: child.definition,
      effectiveIdentity: inherited,
    };
    for (let resume = 0; resume < 2; resume++) {
      await withWorkflowExecutionIdentity(
        core,
        execution,
        caller,
        async (request) => {
          expect(request).not.toBe(caller);
          expect(getWorkflowTaskRunAs(execution)?.workloadId).toBe('parent');
        },
        runAs
      );
    }
    expect(jest.mocked(runAs.withScopedRequest)).toHaveBeenLastCalledWith(expect.any(Function), {
      expectedServiceAccountId: 'account-a',
    });
    expect(jest.mocked(runAs.withScopedRequest)).toHaveBeenCalledTimes(3);
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
    await withWorkflowExecutionIdentity(
      core,
      inheritedParent,
      caller,
      async (request) => {
        expect(resolveInheritedWorkflowIdentity(request, child, context)?.inheritedFrom).toEqual({
          ...identity.inheritedFrom,
          workloadId: 'root',
        });
      },
      runAs
    );
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
        },
        runAs
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
      await withWorkflowExecutionIdentity(
        core,
        execution,
        caller,
        async (request) => {
          expect(
            resolveInheritedWorkflowIdentity(request, child, {
              ...context,
              parentStepId: 'workflow-level-on-failure_fail_child',
              parentStepName: 'child',
            })
          ).toEqual(identity);
        },
        runAs
      );
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
    jest.mocked(runAs.withScopedRequest).mockRejectedValue(new Error('Binding revoked'));
    await expect(
      withWorkflowExecutionIdentity(core, execution, caller, run, runAs)
    ).rejects.toThrow('Binding revoked');
    core.security.serviceAccounts.isEnabled.mockReturnValue(false);
    await expect(
      withWorkflowExecutionIdentity(core, execution, caller, run, runAs)
    ).rejects.toThrow('disabled');
    expect(run).not.toHaveBeenCalled();
  });
});
