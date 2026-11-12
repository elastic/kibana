/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import { validateWorkflowOutputReferences } from './validate_workflow_output_references';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';
import { buildWorkflowLookup } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

const workflows: WorkflowsResponse = {
  totalWorkflows: 4,
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
  const lineCounter = new LineCounter();
  const document = parseDocument(yamlString, { lineCounter });
  return validateWorkflowOutputReferences(
    buildWorkflowLookup(document, lineCounter),
    workflows,
    yamlString,
    lineCounter
  );
};

const parentYaml = (workflowId: string, message: string, type = 'workflow.execute') => `steps:
  - name: ctx
    type: ${type}
    with:
      workflow-id: ${workflowId}
  - name: log
    type: console
    with:
      message: "${message}"
`;

describe('validateWorkflowOutputReferences', () => {
  it('flags outputs the called workflow does not declare, at the field position', () => {
    const results = validate(
      parentYaml('alert-context', '{{ steps.ctx.output.severity }} {{ steps.ctx.output.summary }}')
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      severity: 'error',
      ruleId: 'unknownOutputReference',
      startLineNumber: 9,
      message: expect.stringContaining('"summary"'),
    });
    expect(results[0].message).toContain('severity, risk_score');
  });

  it('handles bracket notation', () => {
    const results = validate(parentYaml('alert-context', "{{ steps['ctx'].output['nope'] }}"));

    expect(results.map(({ message }) => message)).toEqual([expect.stringContaining('"nope"')]);
  });

  it('accepts outputs the called workflow still returns without declaring them', () => {
    expect(validate(parentYaml('alert-context', '{{ steps.ctx.output.legacy_score }}'))).toEqual(
      []
    );
  });

  it('skips workflows whose callers may get any field', () => {
    // Without a workflow.output step, callers get the output of its last step.
    expect(validate(parentYaml('no-output-step', '{{ steps.ctx.output.hits }}'))).toEqual([]);
  });

  it('skips workflows without declared outputs and async calls', () => {
    expect(validate(parentYaml('no-declared-outputs', '{{ steps.ctx.output.anything }}'))).toEqual(
      []
    );
    expect(
      validate(
        parentYaml('alert-context', '{{ steps.ctx.output.summary }}', 'workflow.executeAsync')
      )
    ).toEqual([]);
  });
});
