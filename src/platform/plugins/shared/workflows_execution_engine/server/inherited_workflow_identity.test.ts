/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'node:crypto';
import { coreMock, httpServerMock, securityServiceMock } from '@kbn/core/server/mocks';
import type {
  EsWorkflowExecution,
  WorkflowExecuteStep,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import {
  getWorkflowOriginalRequest,
  resolveInheritedWorkflowIdentity,
  withWorkflowExecutionIdentity,
} from './service_account_execution';

const child = {
  id: 'child',
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
const revision = createHash('sha256').update(child.yaml).digest('hex');
const approval: WorkflowExecuteStep['with'] = {
  'workflow-id': child.id,
  inheritRunAs: true,
};
const parent = (
  withInput = approval,
  accountId: string | undefined = 'account-a'
): Pick<
  EsWorkflowExecution,
  | 'id'
  | 'workflowId'
  | 'spaceId'
  | 'workflowDefinition'
  | 'effectiveIdentity'
  | 'childWorkflowApprovals'
> => ({
  childWorkflowApprovals: {
    serviceAccountId: 'account-a',
    approvedAt: '2026-09-30',
    approvedBy: 'admin',
    snapshots: [
      {
        path: ['child'],
        workflowId: child.id,
        runAsMode: 'inherit',
        yaml: child.yaml,
        definition: child.definition,
        version: 1,
        createdAt: '2026-09-30T00:00:00.000Z',
      },
    ],
  },
  id: 'parent-execution',
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
  inheritRunAs: true,
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
    workflowId: 'parent',
    executionId: 'parent-execution',
    revision,
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
        resolveInheritedWorkflowIdentity(request, child, { ...context, inheritRunAs: false })
      ).toBeUndefined();
      expect(getWorkflowOriginalRequest(request)).toBe(caller);
    });
  });

  it.each(['workflow.execute', 'workflow.executeAsync'] as const)(
    'resolves an approved %s child from the protected parent snapshot',
    async (type) => {
      const execution = parent();
      execution.workflowDefinition.steps = [{ name: 'child', type, with: approval }];
      await withWorkflowExecutionIdentity(core, execution, caller, async (request) => {
        expect(
          resolveInheritedWorkflowIdentity(request, child, context)?.effectiveIdentity
        ).toEqual(identity);
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
    { ...approval, inheritRunAs: false },
    { ...approval, 'workflow-id': '{{ inputs.child }}' },
    { ...approval, runAsMode: 'override' as const },
  ])('rejects missing or dynamic approval: %j', async (withInput) => {
    await withWorkflowExecutionIdentity(core, parent(withInput), caller, async (request) => {
      expect(() => resolveInheritedWorkflowIdentity(request, child, context)).toThrow(
        'Review and approve'
      );
    });
  });

  it('executes the approved snapshot even when the latest child was edited', async () => {
    await withWorkflowExecutionIdentity(core, parent(), caller, async (request) => {
      const result = resolveInheritedWorkflowIdentity(
        request,
        {
          ...child,
          yaml: 'unapproved code',
          definition: { ...child.definition, name: 'Unapproved' },
        },
        context
      );
      expect(result?.workflow.yaml).toBe(child.yaml);
      expect(result?.workflow.definition).toEqual(child.definition);
      expect(result?.workflow.version).toBe(1);
    });
  });

  it('rejects a missing approval and an approval for a different SA', async () => {
    for (const execution of [
      { ...parent(), childWorkflowApprovals: undefined },
      parent(approval, 'other-sa'),
    ]) {
      await withWorkflowExecutionIdentity(core, execution, caller, async (request) => {
        expect(() => resolveInheritedWorkflowIdentity(request, child, context)).toThrow(
          'Review and approve'
        );
      });
    }
  });

  it('requires an explicit approved override for a child with its own SA', async () => {
    const boundChild = {
      ...child,
      definition: { ...child.definition, settings: { run_as: 'child-sa' } },
    };
    const execution = parent({ 'workflow-id': child.id, runAsMode: 'override' });
    if (!execution.childWorkflowApprovals) throw new Error('Missing fixture approval');
    execution.childWorkflowApprovals.snapshots[0] = {
      ...execution.childWorkflowApprovals.snapshots[0],
      runAsMode: 'override',
      definition: boundChild.definition,
    };
    await withWorkflowExecutionIdentity(core, execution, caller, async (request) => {
      const result = resolveInheritedWorkflowIdentity(request, boundChild, context);
      expect(result?.effectiveIdentity.id).toBe('account-a');
      expect(result?.workflow.definition?.settings?.run_as).toBe('child-sa');
    });
    execution.workflowDefinition.steps = [
      { name: 'child', type: 'workflow.execute', with: approval },
    ];
    execution.childWorkflowApprovals.snapshots[0].runAsMode = 'inherit';
    await withWorkflowExecutionIdentity(core, execution, caller, async (request) => {
      expect(() => resolveInheritedWorkflowIdentity(request, boundChild, context)).toThrow(
        'override'
      );
    });
  });

  it('passes only the approved descendants for the invoking step to the child', async () => {
    const execution = parent();
    if (!execution.childWorkflowApprovals) throw new Error('Missing fixture approval');
    const snapshot = execution.childWorkflowApprovals.snapshots[0];
    execution.childWorkflowApprovals.snapshots.push(
      { ...snapshot, path: ['child', 'grandchild'], workflowId: 'grandchild' },
      { ...snapshot, path: ['unrelated', 'grandchild'], workflowId: 'other' }
    );
    await withWorkflowExecutionIdentity(core, execution, caller, async (request) => {
      const result = resolveInheritedWorkflowIdentity(request, child, context);
      expect(result?.childWorkflowApprovals.snapshots).toEqual([
        expect.objectContaining({ path: ['grandchild'], workflowId: 'grandchild' }),
      ]);
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
      effectiveIdentity: inherited?.effectiveIdentity,
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
          workflowId: 'parent',
          executionId: 'parent-execution',
          revision,
        },
      },
    };
    await withWorkflowExecutionIdentity(core, inheritedParent, caller, async (request) => {
      expect(
        resolveInheritedWorkflowIdentity(request, child, context)?.effectiveIdentity.inheritedFrom
      ).toEqual({
        ...identity.inheritedFrom,
        workloadId: 'root',
      });
    });
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
