/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';
import { runWorkflowYamlValidations } from './run_workflow_yaml_validations';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';

describe('runWorkflowYamlValidations', () => {
  it('reports variable validation errors with line-accurate positions', () => {
    const yaml = [
      'name: test-workflow',
      'steps:',
      '  - name: hello_world_step',
      '    type: console',
      '    with:',
      '      message: "{{ input.message }}"',
    ].join('\n');

    const computed = performComputation(yaml);
    expect(computed.yamlDocument).toBeDefined();
    expect(computed.yamlLineCounter).toBeDefined();
    expect(computed.workflowGraph).toBeDefined();
    expect(computed.workflowDefinition).toBeDefined();

    const model = monaco.editor.createModel(yaml, 'yaml');
    const results = runWorkflowYamlValidations({
      yamlString: yaml,
      model,
      yamlDocument: computed.yamlDocument!,
      lineCounter: computed.yamlLineCounter!,
      workflowLookup: computed.workflowLookup,
      workflowGraph: computed.workflowGraph,
      workflowDefinition: computed.workflowDefinition ?? undefined,
    });

    const variableErrors = results.filter(
      (result) => result.owner === 'variable-validation' && result.severity === 'error'
    );

    expect(variableErrors.length).toBeGreaterThan(0);
    expect(variableErrors[0]?.startLineNumber).toBe(6);

    model.dispose();
  });

  it('excludes editor-only connector and ES|QL validators from the preview subset', () => {
    const yaml = [
      'name: connector-workflow',
      'steps:',
      '  - name: slack_step',
      '    type: slack',
      '    connector-id: missing-connector',
      '    with:',
      '      message: hello',
    ].join('\n');

    const computed = performComputation(yaml);
    const model = monaco.editor.createModel(yaml, 'yaml');
    const results = runWorkflowYamlValidations({
      yamlString: yaml,
      model,
      yamlDocument: computed.yamlDocument!,
      lineCounter: computed.yamlLineCounter!,
      workflowLookup: computed.workflowLookup,
      workflowGraph: computed.workflowGraph,
      workflowDefinition: computed.workflowDefinition ?? undefined,
    });

    expect(results.some((result) => result.owner === 'connector-id-validation')).toBe(false);
    expect(results.some((result) => result.owner === 'esql-validation')).toBe(false);

    model.dispose();
  });
});
