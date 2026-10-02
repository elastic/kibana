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
import { convertToWorkflowGraph } from '../../../../graph/build_execution_graph/build_execution_graph';
import type { WorkflowYaml } from '../../../../spec/schema';

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
    timeout?: string;
    'on-failure'?: unknown;
    // `with` values are YAML that may nest arrays/objects (e.g. compose_prompt's writers).
    with?: Record<string, unknown>;
    branches?: Array<{
      name: string;
      steps: Array<{
        name: string;
        type?: string;
        if?: string;
        timeout?: string;
        'on-failure'?: unknown;
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
    expect(NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW.version).toBe(5);
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
        // A writer failure must not abort the round: this workflow is a before-agent
        // hook, and run_before_agent_workflows.ts throws on a failed execution.
        mode: 'settled',
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
          // The tree writer is the third parallel branch. It takes the obtained sandbox_id
          // rather than a conversation id, so it cannot address a different workspace.
          expect.objectContaining({
            name: 'decision_trees',
            steps: [
              expect.objectContaining({
                name: 'hydrate_decision_trees',
                type: 'nightshift.decisionTreeHydrate',
                with: {
                  sandbox_id: '{{ steps.obtain_sandbox.output.sandbox_id }}',
                  prompt: '{{ inputs.prompt }}',
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
          writers: [
            {
              name: 'cortex',
              directory: '/workspace/cortex',
              notification: '{{ steps.hydrate_cortex.output.notification }}',
              completed: '${{ steps.hydrate_cortex.output != null }}',
            },
            {
              name: 'memory',
              directory: '/workspace/memories',
              notification: '{{ steps.memory_materialize_to_sandbox.output.notification }}',
              completed: '${{ steps.memory_materialize_to_sandbox.output != null }}',
            },
            {
              name: 'decision_trees',
              directory: '/workspace/decision-trees',
              notification: '{{ steps.hydrate_decision_trees.output.notification }}',
              completed: '${{ steps.hydrate_decision_trees.output != null }}',
            },
          ],
          recalled_ids: '${{ steps.memory_materialize_to_sandbox.output.recalled_ids }}',
        },
      }),
    ]);
  });

  // The decision-tree writer must reach compose_prompt, or a tree failure is invisible to
  // the model: the branch produces no notification of its own under branch-timeout, and
  // nothing else would tell the model /workspace/decision-trees may be incomplete.
  // `completed` is load-bearing and depends on two template behaviors that would otherwise
  // fail silently: `${{ }}` must yield a real boolean (a `{{ }}` string "false" is truthy,
  // so every writer would look incomplete), and a branch that never ran must read as
  // `null` rather than an empty object (which would look like a completed writer).
  it('renders `completed` as a boolean that is false only for a writer with no output', () => {
    const engine = createWorkflowLiquidEngine();
    const render = (context: Record<string, unknown>) =>
      engine.evalValueSync('steps.hydrate_memory.output != null', context as never);

    expect(render({ steps: { hydrate_memory: { output: { notification: '' } } } })).toBe(true);
    // branch-timeout: the step exists but wrote nothing at all.
    expect(render({ steps: { hydrate_memory: {} } })).toBe(false);
    expect(typeof render({ steps: { hydrate_memory: {} } })).toBe('boolean');
  });

  it('gives compose_prompt every writer, including the decision-tree one', () => {
    const compose = workflow.steps.find((step) => step.name === 'compose_prompt');
    const writers = compose?.with?.writers as Array<{ name: string; directory: string }>;

    expect(writers.map((writer) => writer.name)).toEqual(['cortex', 'memory', 'decision_trees']);
    // Directories must be the real sandbox roots the handlers write to.
    expect(writers.map((writer) => writer.directory)).toEqual([
      '/workspace/cortex',
      '/workspace/memories',
      '/workspace/decision-trees',
    ]);
  });

  // A parallel branch body must compile to leaf nodes only. A step-level `if`, `on-failure`,
  // or `timeout` wraps the step in enter-*/exit-* nodes, which the graph builder rejects with
  // GraphBuildError before the workflow can ever run. The tree branch therefore cannot gate
  // itself in YAML — the step handler no-ops on the feature flag instead. This test is the
  // guard that stops someone "restoring" the swallowed tree failure and breaking every install.
  it('keeps every parallel branch body a straight line of atomic steps', () => {
    const parallel = workflow.steps.find((step) => step.type === 'parallel');
    if (!parallel?.branches) throw new Error('Missing parallel branches');

    for (const branch of parallel.branches) {
      for (const step of branch.steps) {
        expect({ branch: branch.name, step: step.name, if: step.if }).toEqual({
          branch: branch.name,
          step: step.name,
          if: undefined,
        });
        expect(step.timeout).toBeUndefined();
        expect(step['on-failure']).toBeUndefined();
      }
    }
  });

  // The shape assertions above describe the rule; this proves the rule actually holds by
  // running the real YAML through the graph builder. If a branch ever grows an `if`,
  // `on-failure`, or `timeout`, this throws GraphBuildError here rather than at install
  // time in production, which is the failure mode the previous test guards against.
  it('compiles the merged workflow into an execution graph', () => {
    const graph = convertToWorkflowGraph(
      parse(NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW.yaml) as WorkflowYaml
    );

    const nodes = graph
      .nodes()
      .map((nodeId) => graph.node(nodeId))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));

    // The parallel step itself compiles to enter-parallel/exit-parallel, not an atomic node.
    expect(nodes.map((node) => node.type)).toContain('enter-parallel');

    // All three writers compiled as leaf atomic steps inside that parallel. This is the
    // assertion that matters: it only holds if every branch body stayed flow-control free.
    const atomicStepIds = nodes
      .filter((node) => node.type === 'atomic')
      .map((node) => (node as { stepId: string }).stepId)
      .sort();

    expect(atomicStepIds).toEqual([
      'compose_prompt',
      'hydrate_cortex',
      'hydrate_decision_trees',
      'memory_materialize_to_sandbox',
      'obtain_sandbox',
    ]);

    // Top-level steps legitimately compile `if`/`timeout` into enter-*/exit-* wrapper nodes.
    // A branch writer must NOT: a wrapper inside a branch body is what the parallel executor
    // cannot drive, and the graph builder rejects it. No wrapper may name a writer step.
    const writerStepIds = new Set([
      'hydrate_cortex',
      'hydrate_decision_trees',
      'memory_materialize_to_sandbox',
    ]);
    const wrappedWriters = nodes
      .filter(
        (node) =>
          (node.type.startsWith('enter-') || node.type.startsWith('exit-')) &&
          writerStepIds.has((node as { stepId: string }).stepId)
      )
      .map((node) => (node as { stepId: string }).stepId);

    expect(wrappedWriters).toEqual([]);
  });
});
