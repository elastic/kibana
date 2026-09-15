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
  steps: Array<{
    name: string;
    type?: string;
    if?: string;
    'agent-id'?: string;
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
      ['reinforce_decision_trees', 'ai.agent'],
    ]);
  });

  it('runs the reinforcement agent on the message the prepare step built', () => {
    const [, reinforce] = workflow.steps;
    expect(reinforce['agent-id']).toBe('significant-events.decision-tree-reinforcement');
    expect(reinforce.with?.message).toBe('{{ steps.prepare_turn.output.message }}');
  });

  it('skips the agent for rounds the prepare step ruled ineligible', () => {
    expect(workflow.steps[1].if).toBe('${{ steps.prepare_turn.output.skipped == false }}');
  });
});
