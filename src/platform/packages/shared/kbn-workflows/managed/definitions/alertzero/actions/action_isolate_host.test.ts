/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW } from './action_isolate_host';

interface WorkflowStep {
  name: string;
  type?: string;
  with?: { method?: string; path?: string };
  steps?: WorkflowStep[];
}

interface ParsedIsolateWorkflow {
  consts?: { actionMetadata?: { category?: string; impact?: string; approvalPolicy?: string } };
  triggers?: Array<{
    inputs?: {
      properties?: { actionInput?: { properties?: Record<string, unknown>; required?: string[] } };
    };
  }>;
  steps: WorkflowStep[];
}

const workflow = parse(ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW.yaml) as ParsedIsolateWorkflow;

const collectStepsByType = (steps: WorkflowStep[], type: string): WorkflowStep[] => {
  const matches: WorkflowStep[] = [];
  for (const step of steps) {
    if (step.type === type) matches.push(step);
    if (Array.isArray(step.steps)) {
      matches.push(...collectStepsByType(step.steps, type));
    }
  }
  return matches;
};

describe('ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW yaml', () => {
  it('space-scopes the path of every kibana.request step', () => {
    const requestSteps = collectStepsByType(workflow.steps, 'kibana.request');
    const unscoped = requestSteps.filter(
      ({ with: params }) => !params?.path?.startsWith('/s/{{ workflow.spaceId }}/')
    );

    expect(requestSteps.length).toBeGreaterThan(0);
    expect(unscoped.map(({ name, with: params }) => `${name}: ${params?.path}`)).toEqual([]);
  });

  it('should probe action details before isolating, so a missing Actions log privilege fails closed', () => {
    const names = workflow.steps.map(({ name }) => name);

    expect(names.indexOf('probe_action_details')).toBeLessThan(names.indexOf('isolate_host'));
  });

  it('should take only endpoint_ids on actionInput, matching the isolate API required field', () => {
    const actionInput = workflow.triggers?.[0]?.inputs?.properties?.actionInput;

    expect(Object.keys(actionInput?.properties ?? {})).toEqual(['endpoint_ids']);
    expect(actionInput?.required).toEqual(['endpoint_ids']);
  });

  it('should declare contain / high / always-gate metadata from the Defend actions ticket', () => {
    expect(workflow.consts?.actionMetadata).toMatchObject({
      category: 'contain',
      impact: 'high',
      approvalPolicy: 'always-gate',
    });
  });
});
