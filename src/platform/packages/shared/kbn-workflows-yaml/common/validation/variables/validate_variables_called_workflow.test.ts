/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML, { LineCounter } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { collectAllVariables } from './collect_all_variables';
import { validateVariables } from './validate_variables';
import type { CalledWorkflowOutputs } from '../context/registry';
import { createMockWorkflowContextRegistry } from '../context/registry.mock';
import { createStepContextResolver } from '../context/step_context_resolver';

const calledWorkflows: Record<string, CalledWorkflowOutputs> = {
  'alert-context': {
    name: 'Alert context',
    outputs: [
      { name: 'severity', type: 'string' },
      { name: 'risk_score', type: 'number' },
    ],
    returnedOutputNames: ['severity', 'risk_score', 'legacy_score'],
  },
  'no-outputs': { name: 'Silent', outputs: [], returnedOutputNames: [] },
  'no-declared-outputs': { name: 'Free form', outputs: undefined, returnedOutputNames: ['any'] },
  'no-output-step': {
    name: 'Last step',
    outputs: [{ name: 'severity', type: 'string' }],
    returnedOutputNames: undefined,
  },
};

const registry = createMockWorkflowContextRegistry({
  getCalledWorkflowOutputs: (workflowId) => calledWorkflows[workflowId],
});

const callerYaml = (
  workflowId: string,
  message: string,
  { type = 'workflow.execute', comment = '' } = {}
) => `name: Caller
triggers:
  - type: manual
steps:
  - name: ctx
    type: ${type}
    with:
      workflow-id: ${workflowId}
  - name: log
    type: console
    with:
      ${comment}
      message: "${message}"
`;

const validate = (yaml: string) => {
  const lineCounter = new LineCounter();
  const yamlDocument = YAML.parseDocument(yaml, { lineCounter, keepSourceTokens: true });
  const workflowDefinition = yamlDocument.toJSON() as WorkflowYaml;
  const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);
  return validateVariables(
    createStepContextResolver(registry, workflowDefinition, workflowGraph, yamlDocument),
    collectAllVariables(yaml, yamlDocument, lineCounter, workflowGraph),
    workflowDefinition,
    yamlDocument,
    yaml
  ).filter(({ severity }) => severity === 'error');
};

describe('validateVariables called workflow outputs', () => {
  it('flags outputs the called workflow neither declares nor returns, listing what it returns', () => {
    expect(
      validate(
        callerYaml(
          'alert-context',
          '{{ steps.ctx.output.severity }} {{ steps.ctx.output.legacy_scor }}'
        )
      )
    ).toEqual([
      expect.objectContaining({
        ruleId: 'invalidVariableReference',
        startLineNumber: 13,
        message:
          'Workflow "Alert context" doesn’t return an output named "legacy_scor". It returns: severity, risk_score, legacy_score',
      }),
    ]);
  });

  it('says so when the called workflow returns no outputs', () => {
    expect(validate(callerYaml('no-outputs', '{{ steps.ctx.output.severity }}'))).toEqual([
      expect.objectContaining({
        message:
          'Workflow "Silent" doesn’t return an output named "severity". It returns no outputs',
      }),
    ]);
  });

  it('handles bracket notation on every segment', () => {
    expect(
      validate(
        callerYaml(
          'alert-context',
          "{{ steps['ctx'].output['a'] }} {{ steps['ctx']['output']['b'] }} {{ steps.ctx['output'].c }}"
        )
      ).map(({ message }) => message?.match(/output named "([^"]+)"/)?.[1])
    ).toEqual(['a', 'b', 'c']);
  });

  it('ignores comments and plain text', () => {
    expect(
      validate(
        callerYaml('alert-context', 'steps.ctx.output.summary', {
          comment: '# old: {{ steps.ctx.output.summary }}',
        })
      )
    ).toEqual([]);
  });

  it('accepts Liquid object properties and outputs still returned without a declaration', () => {
    expect(
      validate(
        callerYaml(
          'alert-context',
          '{{ steps.ctx.output.size }} {{ steps.ctx.output.legacy_score }}'
        )
      )
    ).toEqual([]);
  });

  it('skips workflows whose callers may get any field, unknown workflows and async calls', () => {
    // Without a workflow.output step, callers get the output of its last step.
    expect(validate(callerYaml('no-output-step', '{{ steps.ctx.output.hits }}'))).toEqual([]);
    expect(validate(callerYaml('no-declared-outputs', '{{ steps.ctx.output.other }}'))).toEqual([]);
    expect(validate(callerYaml('missing', '{{ steps.ctx.output.other }}'))).toEqual([]);
    expect(
      validate(
        callerYaml('alert-context', '{{ steps.ctx.output.summary }}', {
          type: 'workflow.executeAsync',
        })
      )
    ).toEqual([]);
  });
});
