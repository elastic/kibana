/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW,
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
} from '.';
import { createWorkflowLiquidEngine } from '../../../../common/utils';

const workflow = parse(NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW.yaml) as {
  name: string;
  triggers: Array<{
    inputs: { properties: { round_execution_index: { type: string; default: number } } };
  }>;
  steps: Array<{
    name: string;
    type?: string;
    if?: string;
    mode?: string;
    with?: Record<string, string>;
    branches?: Array<{
      name: string;
      steps: Array<{
        name: string;
        type?: string;
        with?: Record<string, string>;
      }>;
    }>;
  }>;
};

describe('nightshift sandbox materialize workspace workflow', () => {
  it.each([
    [0, true],
    [1, false],
    [2, false],
  ])('evaluates sandbox materialization on execution index %i to %s', (index, expected) => {
    const condition = workflow.steps[0].if;
    if (!condition) throw new Error('Missing materialization condition');
    const rendered = createWorkflowLiquidEngine().evalValueSync(condition.slice(3, -2), {
      inputs: { round_execution_index: index, conversation_id: 'conv-1' },
    });
    expect(rendered).toBe(expected);
  });

  it('skips materialization and context output when no sandbox was obtained', () => {
    const engine = createWorkflowLiquidEngine();
    for (const step of workflow.steps.slice(1)) {
      if (!step.if) throw new Error(`Missing condition for ${step.name}`);
      expect(
        engine.evalValueSync(step.if.slice(3, -2), {
          steps: { obtain_sandbox: { output: {} } },
        })
      ).toBe(false);
    }
  });

  it('obtains one sandbox then materializes cortex and memory in parallel with that id', () => {
    expect(NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW.id).toBe(
      NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID
    );
    expect(NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW.version).toBe(2);
    expect(workflow.triggers[0].inputs.properties.round_execution_index).toMatchObject({
      type: 'integer',
      default: 0,
    });
    expect(workflow.name).toBe('Nightshift Sandbox Materialize Workspace');
    expect(workflow.steps).toEqual([
      expect.objectContaining({
        name: 'obtain_sandbox',
        type: 'nightshift.obtainSandbox',
        if: '${{ inputs.round_execution_index == 0 and inputs.conversation_id != null }}',
        with: { conversation_id: '{{ inputs.conversation_id }}' },
      }),
      expect.objectContaining({
        name: 'materialize_workspaces',
        type: 'parallel',
        mode: 'fail-fast',
        if: '${{ steps.obtain_sandbox.output.sandbox_id != null }}',
        branches: [
          expect.objectContaining({
            name: 'cortex',
            steps: [
              expect.objectContaining({
                name: 'hydrate_cortex',
                type: 'nightshift.cortexHydrate',
                with: { sandbox_id: '{{ steps.obtain_sandbox.output.sandbox_id }}' },
              }),
            ],
          }),
          expect.objectContaining({
            name: 'memory',
            steps: [
              expect.objectContaining({
                name: 'memory_materialize_to_sandbox',
                type: 'nightshift.memoryMaterializeToSandbox',
                with: {
                  sandbox_id: '{{ steps.obtain_sandbox.output.sandbox_id }}',
                  prompt: '{{ inputs.prompt }}',
                  agent_id: '{{ inputs.agent_id }}',
                  conversation_id: '{{ inputs.conversation_id }}',
                },
              }),
            ],
          }),
        ],
      }),
      expect.objectContaining({
        name: 'compose_prompt',
        type: 'nightshift.composeHydrateNotifications',
        if: '${{ steps.obtain_sandbox.output.sandbox_id != null }}',
        with: {
          notifications: [
            '{{ steps.hydrate_cortex.output.notification }}',
            '{{ steps.memory_materialize_to_sandbox.output.notification }}',
          ],
          recalled_ids: '${{ steps.memory_materialize_to_sandbox.output.recalled_ids }}',
        },
      }),
    ]);
  });
});
