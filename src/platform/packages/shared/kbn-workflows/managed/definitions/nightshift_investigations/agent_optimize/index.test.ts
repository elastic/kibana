/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW, NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID } from '.';
import { convertToWorkflowGraph } from '../../../../graph/build_execution_graph/build_execution_graph';
import type { WorkflowYaml } from '../../../../spec/schema';

const workflow = parse(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW.yaml) as {
  name: string;
  description: string;
  triggers: Array<{
    inputs: { properties: Record<string, unknown>; additionalProperties?: boolean };
  }>;
  steps: Array<{
    name: string;
    type?: string;
    if?: string;
    mode?: string;
    timeout?: string;
    'branch-timeout'?: string;
    'agent-id'?: string;
    'on-failure'?: unknown;
    with?: Record<string, unknown>;
    branches?: Array<{
      name: string;
      steps: Array<{ name: string; type?: string; with?: Record<string, string> }>;
    }>;
  }>;
};

describe('nightshift agent optimize workflow', () => {
  // The schema is strict, so any after-execution input Agent Builder sends must be declared here.
  it('declares every input the after-execution hook sends', () => {
    const [{ inputs }] = workflow.triggers;
    expect(inputs.additionalProperties).toBe(false);
    expect(Object.keys(inputs.properties).sort()).toEqual(
      [
        'agent_id',
        'connector_id',
        'conversation_id',
        'prompt',
        'response',
        'round_connector_id',
        'round_id',
        'tool_calls',
        'tool_results',
        'workflow_context',
      ].sort()
    );
  });

  it('bounds the strict and round model inputs', () => {
    const { properties } = workflow.triggers[0].inputs;
    expect(properties.connector_id).toEqual(expect.objectContaining({ maxLength: 500 }));
    expect(properties.round_connector_id).toEqual(expect.objectContaining({ maxLength: 500 }));
  });

  it('obtains one sandbox then optimizes cortex and memory in parallel with that id', () => {
    expect(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW.id).toBe(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID);
    expect(workflow.name).toBe('Nightshift Agent Optimize');
    expect(workflow.description).toContain(
      'Authorization to execute this managed workflow permits its defined Memory operations'
    );
    expect(workflow.description).toContain('trusted current-Space execution context');
    expect(workflow.steps).toEqual([
      expect.objectContaining({
        name: 'obtain_sandbox',
        type: 'nightshift.obtainSandbox',
        if: '${{ inputs.conversation_id != null }}',
        with: expect.objectContaining({
          conversation_id: '{{ inputs.conversation_id }}',
          required: false,
        }),
      }),
      expect.objectContaining({
        name: 'optimize_workspaces',
        type: 'parallel',
        mode: 'settled',
        branches: [
          expect.objectContaining({
            name: 'cortex',
            steps: [
              expect.objectContaining({
                name: 'optimize_cortex',
                type: 'nightshift.cortexOptimize',
                with: expect.objectContaining({
                  sandbox_id: '{{ steps.obtain_sandbox.output.sandbox_id }}',
                  connector_id: '{{ inputs.connector_id }}',
                  round_connector_id: '{{ inputs.round_connector_id }}',
                  conversation_id: '{{ inputs.conversation_id }}',
                  round_id: '{{ inputs.round_id }}',
                  // Liquid `{{ }}` would stringify the array, leaving the optimizer with no tool calls to read.
                  tool_calls: '${{ inputs.tool_calls }}',
                  tool_results: '${{ inputs.tool_results }}',
                }),
              }),
            ],
          }),
          expect.objectContaining({
            name: 'memory',
            steps: [
              expect.objectContaining({
                name: 'optimize_memory',
                type: 'nightshift.memoryOptimize',
                with: expect.objectContaining({
                  sandbox_id: '{{ steps.obtain_sandbox.output.sandbox_id }}',
                  connector_id: '{{ inputs.connector_id }}',
                  round_connector_id: '{{ inputs.round_connector_id }}',
                  conversation_id: '{{ inputs.conversation_id }}',
                  round_id: '{{ inputs.round_id }}',
                  recalled_ids:
                    '${{ inputs.workflow_context["nightshift.semantic_memory.recall"].data.recalled_ids }}',
                  tool_calls: '${{ inputs.tool_calls }}',
                  tool_results: '${{ inputs.tool_results }}',
                }),
              }),
            ],
          }),
        ],
      }),
      expect.objectContaining({
        name: 'prepare_turn',
        type: 'nightshift.decisionTreePrepare',
      }),
      expect.objectContaining({
        name: 'ensure_reinforcement_agent',
        type: 'nightshift.ensureInvestigationAgent',
      }),
      expect.objectContaining({
        name: 'reinforce_decision_trees',
        type: 'ai.agent',
      }),
    ]);
    expect(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW.version).toBe(3);
  });

  // A parallel branch has no per-branch timeout: it inherits `branch-timeout`. Reinforcement
  // runs an ai.agent for up to 900s, so putting it in a branch would kill it at 120s. It is
  // a sequential phase after the parallel instead, with its own budget.
  it('keeps reinforcement sequential so it is not bounded by the 120s branch-timeout', () => {
    const parallelIndex = workflow.steps.findIndex((step) => step.type === 'parallel');
    const reinforceIndex = workflow.steps.findIndex((step) => step.type === 'ai.agent');

    expect(parallelIndex).toBeGreaterThanOrEqual(0);
    expect(reinforceIndex).toBeGreaterThan(parallelIndex);

    // The agent's own 900s budget, and no branch-timeout anywhere near it.
    expect(workflow.steps[reinforceIndex].timeout).toBe('900s');

    // Each optimizer still gets 120s, and the parallel's own budget is strictly above it so a
    // branch killed by `branch-timeout` is reported by `settled` instead of failing the step.
    const parallel = workflow.steps[parallelIndex];
    expect(parallel['branch-timeout']).toBe('120s');
    expect(parallel.timeout).toBe('150s');
  });

  // Liquid `{{ }}` stringifies the array as "[object Object]…", the step's preprocess then
  // falls back to [], and extractAccessedTreeIds([]) makes every round distill from scratch.
  it('forwards the investigator tool_calls into the prepare step', () => {
    const prepare = workflow.steps.find((step) => step.name === 'prepare_turn');
    expect(prepare?.with?.tool_calls).toBe('${{ inputs.tool_calls }}');
  });

  // Only the eligible investigator rounds may rewrite the trees, so the agent and the
  // install that guarantees it are both gated on the prepare step's verdict.
  it('skips the agent, and installing it, for rounds the prepare step ruled ineligible', () => {
    const ineligible = '${{ steps.prepare_turn.output.skipped == false }}';
    expect(workflow.steps.find((step) => step.name === 'ensure_reinforcement_agent')?.if).toBe(
      ineligible
    );
    expect(workflow.steps.find((step) => step.name === 'reinforce_decision_trees')?.if).toBe(
      ineligible
    );
  });

  // The reinforcement workflow used to guarantee this agent and no longer runs. Without the
  // ensure step here, a trees-enabled install would fail the moment the agent was pruned.
  it('installs the reinforcement agent it is about to run', () => {
    const ensure = workflow.steps.find((step) => step.name === 'ensure_reinforcement_agent');
    const reinforce = workflow.steps.find((step) => step.name === 'reinforce_decision_trees');
    expect(ensure?.with?.agent_id).toBe(reinforce?.['agent-id']);
  });

  // Proves the sequential phase really compiles: the reinforcement steps become graph nodes
  // after the parallel, each with its own timeout zone. If anyone moves the agent into a
  // branch, this throws GraphBuildError rather than timing out silently at 120s in production.
  it('compiles the reinforcement phase into an execution graph', () => {
    const graph = convertToWorkflowGraph(
      parse(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW.yaml) as WorkflowYaml
    );

    const nodes = graph
      .nodes()
      .map((nodeId) => graph.node(nodeId))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));

    // The agent's own 900s budget survives compilation as a step-level timeout zone,
    // and the optimizer fan-out keeps its own, above the per-branch 120s.
    const timeoutFor = (stepId: string) =>
      nodes.find((node) => node.type === 'enter-timeout-zone' && node.stepId === stepId) as
        | { timeout: string }
        | undefined;

    expect(timeoutFor('reinforce_decision_trees')?.timeout).toBe('900s');
    expect(timeoutFor('optimize_workspaces')?.timeout).toBe('150s');
    expect(timeoutFor('obtain_sandbox')?.timeout).toBe('60s');

    // The agent compiles as a top-level atomic step, reached after the parallel. Were it
    // inside a branch, the build would have thrown on the flow-control wrappers its `if`
    // compiles into — this is the check that the sequential shape is what actually builds.
    const agent = nodes.find(
      (node) => node.type === 'atomic' && node.stepId === 'reinforce_decision_trees'
    );
    expect(agent?.stepType).toBe('ai.agent');

    // Every step in the workflow is a leaf atomic step, and the reinforcement phase sits
    // after the two optimizers — the ordering that keeps it out of the 120s branch budget.
    const atomicStepIds = nodes
      .filter((node) => node.type === 'atomic')
      .map((node) => (node as { stepId: string }).stepId);
    expect(atomicStepIds).toEqual([
      'obtain_sandbox',
      'optimize_cortex',
      'optimize_memory',
      'prepare_turn',
      'ensure_reinforcement_agent',
      'reinforce_decision_trees',
    ]);
  });

  // A swallowed failure here reports a green round that silently reinforced nothing, which is
  // how a missing agent went unnoticed. Post-execution hooks log failures rather than aborting
  // the investigation, so there is nothing to protect by continuing.
  it('lets every reinforcement step fail loudly', () => {
    const reinforcement = workflow.steps.filter(
      (step) =>
        step.type === 'ai.agent' ||
        step.type === 'nightshift.decisionTreePrepare' ||
        step.type === 'nightshift.ensureInvestigationAgent'
    );
    expect(reinforcement).toHaveLength(3);
    expect(reinforcement.map((step) => step['on-failure'])).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});
