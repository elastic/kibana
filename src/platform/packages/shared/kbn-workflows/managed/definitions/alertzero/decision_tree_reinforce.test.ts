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
  ALERTZERO_DECISION_TREE_REINFORCE_WORKFLOW,
  ALERTZERO_DECISION_TREE_REINFORCE_WORKFLOW_ID,
} from './decision_tree_reinforce';

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  'on-failure'?: { continue?: boolean };
}

const definition = parse(ALERTZERO_DECISION_TREE_REINFORCE_WORKFLOW.yaml) as {
  consts?: Record<string, unknown>;
  steps: YamlStep[];
  triggers?: Array<{ inputs?: { required?: string[] } }>;
};

const stepByName = (name: string) => definition.steps.find((step) => step.name === name);

describe('decision tree reinforce workflow', () => {
  it('is the global workflow the forensic run calls', () => {
    expect(ALERTZERO_DECISION_TREE_REINFORCE_WORKFLOW.id).toBe(
      ALERTZERO_DECISION_TREE_REINFORCE_WORKFLOW_ID
    );
    expect(definition.consts?.ai_index_id).toBe('security-decision-trees');
    expect(definition.triggers?.[0]?.inputs?.required).toEqual([
      'symptom',
      'ki_id',
      'rationale',
      'propose',
    ]);
  });

  it('drafts only after prepare, and writes only a draft that passed the guardrails', () => {
    expect(stepByName('prepare_turn')?.type).toBe('alertzero.prepareDecisionTreeTurn');
    expect(stepByName('draft_decision_tree')?.type).toBe('ai.agent');
    expect(stepByName('draft_decision_tree')?.if).toBe(
      '${{ steps.prepare_turn.output.skipped == false }}'
    );
    expect(stepByName('draft_decision_tree')?.['on-failure']).toEqual({ continue: true });
    expect(stepByName('validate_decision_tree')?.type).toBe('alertzero.persistDecisionTree');
    expect(stepByName('write_decision_tree')?.type).toBe('context-engine.createKi');
    expect(stepByName('write_decision_tree')?.if).toBe(
      '${{ steps.validate_decision_tree.output.skipped == false }}'
    );
    expect(stepByName('write_decision_tree')?.with).toMatchObject({
      ai_index_id: '{{ consts.ai_index_id }}',
      refresh: true,
    });
  });
});
