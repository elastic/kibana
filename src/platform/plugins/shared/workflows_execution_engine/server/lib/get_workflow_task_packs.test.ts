/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import {
  resolveWorkflowTaskPacks,
  WORKFLOWS_TASK_SCHEDULING_PACK_ID,
} from './get_workflow_task_packs';

const definition = {
  steps: [{ name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} }],
} as unknown as WorkflowYaml;

describe('resolveWorkflowTaskPacks', () => {
  it('returns undefined (not []) when the definition is not available', () => {
    expect(
      resolveWorkflowTaskPacks(
        { getTaskBundlePacks: () => [{ id: 'workflow-steps:slack', stepTypes: ['slack'] }] },
        'workflow:run',
        undefined
      )
    ).toBeUndefined();
  });

  it('returns undefined (not []) when the host has no getTaskBundlePacks (a task process host)', () => {
    expect(resolveWorkflowTaskPacks({}, 'workflow:run', definition)).toBeUndefined();
  });

  it('returns undefined (not []) when getTaskBundlePacks does not know this task type', () => {
    expect(
      resolveWorkflowTaskPacks({ getTaskBundlePacks: () => undefined }, 'workflow:run', definition)
    ).toBeUndefined();
  });

  it('returns the resolved pack ids, plus the task-scheduling pack a worker needs to schedule a resume', () => {
    expect(
      resolveWorkflowTaskPacks(
        { getTaskBundlePacks: () => [{ id: 'workflow-steps:slack', stepTypes: ['slack'] }] },
        'workflow:run',
        definition
      )
    ).toEqual(expect.arrayContaining(['workflow-steps:slack', WORKFLOWS_TASK_SCHEDULING_PACK_ID]));
  });

  it('still unions in the task-scheduling pack when the definition genuinely needs no step pack', () => {
    const internalOnlyDefinition = {
      steps: [{ name: 'setValue', type: 'data.set', with: { key: 'a', value: 1 } }],
    } as unknown as WorkflowYaml;
    // [] here would ask a worker to load nothing at all, which cannot even schedule the
    // `workflow:resume` an idle timeout needs: the task-scheduling pack must still be there.
    expect(
      resolveWorkflowTaskPacks(
        { getTaskBundlePacks: () => [{ id: 'workflow-steps:slack', stepTypes: ['slack'] }] },
        'workflow:run',
        internalOnlyDefinition
      )
    ).toEqual([WORKFLOWS_TASK_SCHEDULING_PACK_ID]);
  });
});
