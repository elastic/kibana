/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import ACTION_CREATE_RULE_YAML from './action_create_rule.yaml';

/** Local shape: the parsed YAML is untyped, and only these fields are asserted on. */
interface WorkflowStep {
  name?: string;
  type?: string;
  with?: Record<string, unknown>;
}

interface ParsedWorkflow {
  enabled: boolean;
  tags?: string[];
  consts?: Record<string, unknown>;
  triggers: Array<{
    type: string;
    inputs?: { properties?: Record<string, unknown>; required?: string[] };
  }>;
  steps: WorkflowStep[];
}

const actionWorkflow = parse(ACTION_CREATE_RULE_YAML) as ParsedWorkflow;

describe('AlertZero create-rule action workflow', () => {
  it('carries the generic action tag so the catalog can be discovered by tag', () => {
    expect(actionWorkflow.tags).toContain('action');
  });

  it('declares its catalog metadata under consts, the only place the schema preserves', () => {
    expect(actionWorkflow.consts?.actionMetadata).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        category: 'tune',
        impact: 'low',
        reversible: true,
        approvalPolicy: 'always-gate',
      })
    );
  });

  it('takes a single actionInput object, matching the generic gate contract', () => {
    const properties = actionWorkflow.triggers.find(({ type }) => type === 'manual')?.inputs
      ?.properties;

    expect(Object.keys(properties ?? {})).toEqual(['actionInput']);
  });

  it('requires the scope-defining rule fields rather than defaulting them', () => {
    const actionInput = actionWorkflow.triggers.find(({ type }) => type === 'manual')?.inputs
      ?.properties?.actionInput as { required?: string[] };

    expect(actionInput.required).toEqual(['name', 'description', 'query', 'index']);
  });

  it('creates the rule through the registered security step rather than a raw request', () => {
    expect(actionWorkflow.steps.map(({ type }) => type)).toContain('security.createRule');
  });

  it('does not default the query or the index, which would widen the rule silently', () => {
    const createRule = actionWorkflow.steps.find(
      ({ type }) => type === 'security.createRule'
    ) as WorkflowStep;
    const { rule } = (createRule.with ?? {}) as { rule: Record<string, string> };

    expect(rule.query).not.toContain('default:');
    expect(rule.index).not.toContain('default:');
  });

  it('emits an explicit output, since workflow.execute cannot type the child result', () => {
    const output = actionWorkflow.steps.find(({ type }) => type === 'workflow.output') as {
      with?: Record<string, unknown>;
    };

    expect(Object.keys(output.with ?? {})).toEqual(expect.arrayContaining(['ruleId', 'ruleName']));
  });
});
