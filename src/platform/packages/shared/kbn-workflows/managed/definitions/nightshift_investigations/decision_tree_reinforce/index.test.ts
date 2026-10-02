/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  NIGHTSHIFT_DECISION_TREE_REINFORCE_WORKFLOW,
  NIGHTSHIFT_DECISION_TREE_REINFORCE_WORKFLOW_ID,
} from '.';

const workflow = parse(NIGHTSHIFT_DECISION_TREE_REINFORCE_WORKFLOW.yaml) as {
  name: string;
  triggers: Array<{
    inputs: {
      properties: Record<string, { type: string; maxLength?: number }>;
      additionalProperties?: boolean;
    };
  }>;
  steps: Array<{
    name: string;
    type?: string;
    if?: string;
    'agent-id'?: string;
    'connector-id'?: string;
    'connector-id-by-feature'?: string;
    'plugin-id'?: string;
    'product-solution'?: string;
    'product-feature'?: string;
    'on-failure'?: unknown;
    with?: Record<string, string>;
  }>;
};

describe('decision tree reinforce workflow', () => {
  it('prepares the turn, then runs the reinforcement agent on it', () => {
    expect(NIGHTSHIFT_DECISION_TREE_REINFORCE_WORKFLOW.id).toBe(
      NIGHTSHIFT_DECISION_TREE_REINFORCE_WORKFLOW_ID
    );
    expect(workflow.name).toBe('Decision Tree Reinforce');
    expect(workflow.steps.map((step) => [step.name, step.type])).toEqual([
      ['prepare_turn', 'nightshift.decisionTreePrepare'],
      ['resolve_model', 'nightshift.resolveModel'],
      ['ensure_reinforcement_agent', 'nightshift.ensureInvestigationAgent'],
      ['reinforce_decision_trees', 'ai.agent'],
    ]);
  });

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
        'workflow_context',
      ].sort()
    );
  });

  // ${{ }} passes the array through. Liquid `{{ }}` stringifies it as
  // "[object Object][object Object]", JSON.parse in preprocess falls back to [],
  // and extractAccessedTreeIds([]) makes every round distill from scratch.
  it('forwards the investigator tool_calls into the prepare step', () => {
    const [prepare] = workflow.steps;
    expect(prepare.with?.tool_calls).toBe('${{ inputs.tool_calls }}');
  });

  it('runs the reinforcement agent on the message the prepare step built', () => {
    const [, , , reinforce] = workflow.steps;
    expect(reinforce['agent-id']).toBe('significant-events.decision-tree-reinforcement');
    expect(reinforce).toMatchObject({
      'connector-id': '{{ steps.resolve_model.output.connector_id }}',
      'plugin-id': 'significant_events_decision_tree_reinforce',
      'product-solution': 'observability',
      'product-feature': 'nightshift',
    });
    expect(reinforce['connector-id-by-feature']).toBeUndefined();
    expect(reinforce.with?.message).toBe('{{ steps.prepare_turn.output.message }}');
  });

  it('declares strict and round model inputs and resolves them after prepare', () => {
    expect(workflow.triggers[0].inputs.properties).toEqual(
      expect.objectContaining({
        connector_id: expect.objectContaining({ type: 'string', maxLength: 500 }),
        round_connector_id: expect.objectContaining({ type: 'string', maxLength: 500 }),
      })
    );
    expect(workflow.steps[1]).toMatchObject({
      name: 'resolve_model',
      type: 'nightshift.resolveModel',
      if: '${{ steps.prepare_turn.output.skipped == false }}',
      with: {
        step: 'investigation',
        connector_id: '{{ inputs.connector_id }}',
        round_connector_id: '{{ inputs.round_connector_id }}',
      },
    });
  });

  // Nothing else installs it, so the agent step resolves a missing agent without this.
  it('installs the agent it is about to run', () => {
    const [, , ensure, reinforce] = workflow.steps;
    expect(ensure.with?.agent_id).toBe(reinforce['agent-id']);
  });

  it('skips the agent, and installing it, for rounds the prepare step ruled ineligible', () => {
    const ineligible = '${{ steps.prepare_turn.output.skipped == false }}';
    expect(workflow.steps[1].if).toBe(ineligible);
    expect(workflow.steps[2].if).toBe(ineligible);
    expect(workflow.steps[3].if).toBe(ineligible);
  });

  // A swallowed failure here reports a green execution that silently reinforced nothing, which
  // is how a missing agent went unnoticed. Post-execution hooks log failures without aborting
  // the investigation, so there is nothing to protect by continuing.
  it('lets every step fail loudly', () => {
    expect(workflow.steps.map((step) => step['on-failure'])).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});
