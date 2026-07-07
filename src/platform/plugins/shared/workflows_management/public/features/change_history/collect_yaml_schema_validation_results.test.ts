/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';
import {
  collectYamlSchemaValidationResults,
  mergeWorkflowYamlValidationResults,
} from './collect_yaml_schema_validation_results';
import { getWorkflowZodSchema } from '../../../common/schema';
import { performComputation } from '../../entities/workflows/store/workflow_detail/utils/computation';
import { triggerSchemas } from '../../trigger_schemas';
import type { YamlValidationResult } from '../validate_workflow_yaml/model/types';

describe('collectYamlSchemaValidationResults', () => {
  const workflowZodSchema = getWorkflowZodSchema({}, triggerSchemas.getRegisteredIds());

  it('returns formatted yaml schema validation results from monaco markers', () => {
    const yaml = 'name: test-workflow\n';
    const computed = performComputation(yaml);
    const model = monaco.editor.createModel(yaml, 'yaml');

    monaco.editor.setModelMarkers(model, 'yaml', [
      {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 5,
        message: 'Missing property "steps".',
        severity: monaco.MarkerSeverity.Error,
        source: 'yaml-schema: file:///workflow-schema.json',
      },
    ]);

    const results = collectYamlSchemaValidationResults(
      model,
      computed.yamlDocument ?? null,
      workflowZodSchema
    );

    expect(results).toHaveLength(1);
    expect(results[0].owner).toBe('yaml');
    expect(results[0].message).toContain('steps');

    model.dispose();
  });

  it('returns an empty list when there are no yaml markers', () => {
    const yaml = 'name: test-workflow\n';
    const computed = performComputation(yaml);
    const model = monaco.editor.createModel(yaml, 'yaml');

    const results = collectYamlSchemaValidationResults(
      model,
      computed.yamlDocument ?? null,
      workflowZodSchema
    );

    expect(results).toEqual([]);

    model.dispose();
  });

  it('parses model yaml when yamlDocument is null', () => {
    const yaml = 'name: test-workflow\n';
    const model = monaco.editor.createModel(yaml, 'yaml');

    monaco.editor.setModelMarkers(model, 'yaml', [
      {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 5,
        message: 'Missing property "steps".',
        severity: monaco.MarkerSeverity.Error,
        source: 'yaml-schema: file:///workflow-schema.json',
      },
    ]);

    const results = collectYamlSchemaValidationResults(model, null, workflowZodSchema);

    expect(results).toHaveLength(1);
    expect(results[0].owner).toBe('yaml');

    model.dispose();
  });

  it('filters yaml-schema markers on dynamic template values', () => {
    const yaml = [
      'name: test-workflow',
      'steps:',
      '  - name: step',
      '    type: console',
      '    with:',
      '      message: ${{ inputs.message }}',
    ].join('\n');
    const computed = performComputation(yaml);
    const model = monaco.editor.createModel(yaml, 'yaml');

    monaco.editor.setModelMarkers(model, 'yaml', [
      {
        startLineNumber: 6,
        startColumn: 16,
        endLineNumber: 6,
        endColumn: 38,
        message: 'Incorrect type.',
        severity: monaco.MarkerSeverity.Error,
        source: 'yaml-schema: file:///workflow-schema.json',
      },
    ]);

    const results = collectYamlSchemaValidationResults(
      model,
      computed.yamlDocument ?? null,
      workflowZodSchema
    );

    expect(results).toEqual([]);

    model.dispose();
  });

  it('merges custom and yaml schema validation results without duplicating yaml owners', () => {
    const customResults: YamlValidationResult[] = [
      {
        id: 'custom-error',
        owner: 'step-name-validation',
        severity: 'error',
        message: 'Duplicate step name',
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 10,
        hoverMessage: null,
        afterMessage: null,
      },
      {
        id: 'stale-yaml-error',
        owner: 'yaml',
        severity: 'error',
        message: 'stale',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 2,
        hoverMessage: null,
        afterMessage: null,
      },
    ];
    const yamlResults: YamlValidationResult[] = [
      {
        id: 'yaml-error',
        owner: 'yaml',
        severity: 'error',
        message: 'Missing property "steps".',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 5,
        hoverMessage: null,
        afterMessage: null,
      },
    ];

    expect(mergeWorkflowYamlValidationResults(customResults, yamlResults)).toEqual([
      customResults[0],
      yamlResults[0],
    ]);
  });
});
