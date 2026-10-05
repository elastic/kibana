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
  NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW,
  NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID,
} from '.';
import { createWorkflowLiquidEngine } from '../../../../common/utils';

const workflow = parse(NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW.yaml) as {
  name: string;
  triggers: Array<{
    inputs: { properties: { round_execution_index: { type: string; default: number } } };
  }>;
  steps: Array<{ name: string; type?: string; if?: string }>;
};

describe('decision tree hydrate workflow', () => {
  it('is a pre-round workflow that materializes trees into the sandbox', () => {
    expect(NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW.id).toBe(
      NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID
    );
    expect(workflow.name).toBe('Decision Tree Hydrate');
    expect(workflow.steps).toEqual([
      expect.objectContaining({
        name: 'hydrate_decision_trees',
        type: 'nightshift.decisionTreeHydrate',
      }),
    ]);
  });

  it.each([
    [0, true],
    [1, false],
    [2, false],
  ])('evaluates hydration on execution index %i to %s', (index, expected) => {
    const condition = workflow.steps[0].if;
    if (!condition) throw new Error('Missing hydration condition');
    const rendered = createWorkflowLiquidEngine().evalValueSync(condition.slice(3, -2), {
      inputs: { round_execution_index: index, conversation_id: 'conv-1' },
    });
    expect(rendered).toBe(expected);
  });

  it('hydrates only on the first execution of a conversation round', () => {
    expect(NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW.version).toBe(2);
    expect(workflow.triggers[0].inputs.properties.round_execution_index).toMatchObject({
      type: 'integer',
      default: 0,
    });
    expect(workflow.steps[0].if).toBe(
      '${{ inputs.round_execution_index == 0 and inputs.conversation_id != null }}'
    );
  });
});
