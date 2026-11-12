/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { collectAllVariables } from '@kbn/workflows-yaml';
import { validateWorkflowOutputReferences } from './validate_workflow_output_references';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';

const workflows: WorkflowsResponse = {
  totalWorkflows: 3,
  workflows: {
    'alert-context': {
      id: 'alert-context',
      name: 'Alert context',
      outputNames: ['severity', 'risk_score'],
      returnedOutputNames: ['severity', 'risk_score', 'legacy_score'],
    },
    'no-declared-outputs': {
      id: 'no-declared-outputs',
      name: 'Free form',
      returnedOutputNames: ['anything'],
    },
    'no-output-step': { id: 'no-output-step', name: 'Last step', outputNames: ['severity'] },
  },
};

const validate = (yamlString: string) => {
  const { workflowLookup, workflowGraph, yamlDocument, yamlLineCounter } =
    performComputation(yamlString);
  if (!workflowLookup || !workflowGraph || !yamlDocument || !yamlLineCounter) {
    throw new Error('Expected the fixture to parse and build a graph');
  }
  return validateWorkflowOutputReferences(
    workflowLookup,
    workflows,
    collectAllVariables(yamlString, yamlDocument, yamlLineCounter, workflowGraph)
  );
};

const parentYaml = (
  workflowId: string,
  message: string,
  { type = 'workflow.execute', comment = '' } = {}
) => `name: Parent
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

const fieldsIn = (results: ReturnType<typeof validate>) =>
  results.map(({ message }) => message?.match(/output named "([^"]+)"/)?.[1]);

describe('validateWorkflowOutputReferences', () => {
  it('flags outputs the called workflow neither declares nor returns, listing what it returns', () => {
    const results = validate(
      parentYaml(
        'alert-context',
        '{{ steps.ctx.output.severity }} {{ steps.ctx.output.legacy_scor }}'
      )
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      severity: 'error',
      ruleId: 'unknownOutputReference',
      startLineNumber: 13,
      message: expect.stringContaining('"legacy_scor"'),
    });
    expect(results[0].message).toContain('severity, risk_score, legacy_score');
  });

  it('handles bracket notation on every segment', () => {
    expect(
      fieldsIn(
        validate(
          parentYaml(
            'alert-context',
            "{{ steps['ctx'].output['a'] }} {{ steps['ctx']['output']['b'] }} {{ steps.ctx['output'].c }}"
          )
        )
      )
    ).toEqual(['a', 'b', 'c']);
  });

  it('ignores comments, plain text and dynamic keys', () => {
    expect(
      validate(
        parentYaml('alert-context', 'steps.ctx.output.summary {{ steps.ctx.output[field] }}', {
          comment: '# old: {{ steps.ctx.output.summary }}',
        })
      )
    ).toEqual([]);
  });

  it('accepts Liquid object properties and outputs still returned without a declaration', () => {
    expect(
      validate(
        parentYaml(
          'alert-context',
          '{{ steps.ctx.output.size }} {{ steps.ctx.output.legacy_score }}'
        )
      )
    ).toEqual([]);
  });

  it('skips workflows whose callers may get any field', () => {
    // Without a workflow.output step, callers get the output of its last step.
    expect(validate(parentYaml('no-output-step', '{{ steps.ctx.output.hits }}'))).toEqual([]);
    expect(validate(parentYaml('no-declared-outputs', '{{ steps.ctx.output.other }}'))).toEqual([]);
  });

  it('skips async calls', () => {
    expect(
      validate(
        parentYaml('alert-context', '{{ steps.ctx.output.summary }}', {
          type: 'workflow.executeAsync',
        })
      )
    ).toEqual([]);
  });
});
