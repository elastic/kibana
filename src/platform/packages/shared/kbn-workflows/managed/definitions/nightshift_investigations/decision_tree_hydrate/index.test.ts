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

const workflow = parse(NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW.yaml) as {
  name: string;
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

  it('skips the step when there is no conversation to namespace the sandbox', () => {
    expect(workflow.steps[0].if).toBe('${{ inputs.conversation_id != null }}');
  });
});
