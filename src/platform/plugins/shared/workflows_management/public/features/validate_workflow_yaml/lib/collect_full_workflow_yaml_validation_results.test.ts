/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';

const structuralResult: YamlValidationResult = {
  id: 'structural-error',
  owner: 'variable-validation',
  severity: 'error',
  message: 'Structural error',
  startLineNumber: 1,
  startColumn: 1,
  endLineNumber: 1,
  endColumn: 2,
  hoverMessage: null,
  afterMessage: null,
};

const connectorResult: YamlValidationResult = {
  id: 'connector-error',
  owner: 'connector-id-validation',
  severity: 'error',
  message: 'Missing connector',
  startLineNumber: 2,
  startColumn: 1,
  endLineNumber: 2,
  endColumn: 2,
  hoverMessage: null,
  afterMessage: null,
};

const graphResult: YamlValidationResult = {
  id: 'graph-error',
  owner: 'graph-build-validation',
  severity: 'error',
  message: 'Graph build failed',
  startLineNumber: 3,
  startColumn: 1,
  endLineNumber: 3,
  endColumn: 2,
  hoverMessage: null,
  afterMessage: null,
};

const workflowInputResult: YamlValidationResult = {
  id: 'workflow-input-error',
  owner: 'workflow-inputs-validation',
  severity: 'error',
  message: 'Invalid workflow input',
  startLineNumber: 5,
  startColumn: 1,
  endLineNumber: 5,
  endColumn: 2,
  hoverMessage: null,
  afterMessage: null,
};

const stepPropertyResult: YamlValidationResult = {
  id: 'step-property-error',
  owner: 'step-property-validation',
  severity: 'error',
  message: 'Invalid step property',
  startLineNumber: 4,
  startColumn: 1,
  endLineNumber: 4,
  endColumn: 2,
  hoverMessage: null,
  afterMessage: null,
};

const esqlResult: YamlValidationResult = {
  id: 'esql-error',
  owner: 'esql-validation',
  severity: 'error',
  message: 'Invalid ES|QL',
  startLineNumber: 6,
  startColumn: 1,
  endLineNumber: 6,
  endColumn: 2,
  hoverMessage: null,
  afterMessage: null,
};

jest.mock('./run_workflow_yaml_validations', () => ({
  runWorkflowYamlValidations: jest.fn(() => [structuralResult]),
}));

jest.mock('./validate_connector_ids', () => ({
  validateConnectorIds: jest.fn(() => [connectorResult]),
}));

jest.mock('./validate_graph_build', () => ({
  validateGraphBuild: jest.fn(() => [graphResult]),
}));

jest.mock('./collect_all_step_property_items', () => ({
  collectAllStepPropertyItems: jest.fn(() => []),
}));

jest.mock('./validate_step_properties', () => ({
  validateStepProperties: jest.fn(async () => []),
}));

jest.mock('./validate_workflow_inputs', () => ({
  validateWorkflowInputs: jest.fn(() => [workflowInputResult]),
}));

jest.mock('../../../widgets/workflow_yaml_editor/lib/esql_validation/validate_esql_steps', () => ({
  validateEsqlSteps: jest.fn(async () => [esqlResult]),
}));

import { collectAllStepPropertyItems } from './collect_all_step_property_items';
import { collectFullWorkflowYamlValidationResults } from './collect_full_workflow_yaml_validation_results';
import { runWorkflowYamlValidations } from './run_workflow_yaml_validations';
import { validateConnectorIds } from './validate_connector_ids';
import { validateGraphBuild } from './validate_graph_build';
import { validateStepProperties } from './validate_step_properties';
import { validateWorkflowInputs } from './validate_workflow_inputs';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';
import { validateEsqlSteps } from '../../../widgets/workflow_yaml_editor/lib/esql_validation/validate_esql_steps';
import type { YamlValidationResult } from '../model/types';

const mockValidateEsqlSteps = validateEsqlSteps as jest.Mock;
const mockCollectAllStepPropertyItems = collectAllStepPropertyItems as jest.Mock;
const mockValidateStepProperties = validateStepProperties as jest.Mock;

describe('collectFullWorkflowYamlValidationResults', () => {
  const yaml = [
    'name: test-workflow',
    'steps:',
    '  - name: hello',
    '    type: console',
    '    with:',
    '      message: hello',
  ].join('\n');

  const computed = performComputation(yaml);

  it('layers contextual validators on top of structural validation', async () => {
    const model = monaco.editor.createModel(yaml, 'yaml');

    const results = await collectFullWorkflowYamlValidationResults({
      yamlString: yaml,
      model,
      yamlDocument: computed.yamlDocument!,
      lineCounter: computed.yamlLineCounter!,
      workflowLookup: computed.workflowLookup,
      workflowGraph: computed.workflowGraph,
      workflowDefinition: computed.workflowDefinition ?? undefined,
      graphBuildError: computed.graphBuildError,
      context: {
        connectorTypes: {},
        connectorsManagementUrl: 'http://test/connectors',
        workflows: { workflows: {}, totalWorkflows: 0 },
        getPropertyHandler: () => null,
        esqlCallbacks: {},
      },
    });

    expect(runWorkflowYamlValidations).toHaveBeenCalled();
    expect(validateConnectorIds).toHaveBeenCalled();
    expect(validateGraphBuild).toHaveBeenCalled();
    expect(validateWorkflowInputs).toHaveBeenCalled();
    expect(mockValidateEsqlSteps).toHaveBeenCalled();

    expect(results).toEqual(
      expect.arrayContaining([
        structuralResult,
        connectorResult,
        graphResult,
        workflowInputResult,
        esqlResult,
      ])
    );

    model.dispose();
  });

  it('includes step-property validation when step property items are collected', async () => {
    mockCollectAllStepPropertyItems.mockReturnValueOnce([{ stepId: 'hello' }]);
    mockValidateStepProperties.mockResolvedValueOnce([stepPropertyResult]);

    const model = monaco.editor.createModel(yaml, 'yaml');

    const results = await collectFullWorkflowYamlValidationResults({
      yamlString: yaml,
      model,
      yamlDocument: computed.yamlDocument!,
      lineCounter: computed.yamlLineCounter!,
      workflowLookup: computed.workflowLookup,
      workflowGraph: computed.workflowGraph,
      workflowDefinition: computed.workflowDefinition ?? undefined,
      graphBuildError: computed.graphBuildError,
      context: {
        connectorTypes: {},
        connectorsManagementUrl: 'http://test/connectors',
        workflows: { workflows: {}, totalWorkflows: 0 },
        getPropertyHandler: () => null,
        esqlCallbacks: {},
      },
    });

    expect(mockValidateStepProperties).toHaveBeenCalled();
    expect(results).toEqual(expect.arrayContaining([stepPropertyResult]));

    model.dispose();
  });

  it('returns no esql results when validation is aborted', async () => {
    mockValidateEsqlSteps.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    const model = monaco.editor.createModel(yaml, 'yaml');
    const abortController = new AbortController();

    const results = await collectFullWorkflowYamlValidationResults({
      yamlString: yaml,
      model,
      yamlDocument: computed.yamlDocument!,
      lineCounter: computed.yamlLineCounter!,
      workflowLookup: computed.workflowLookup,
      workflowGraph: computed.workflowGraph,
      workflowDefinition: computed.workflowDefinition ?? undefined,
      graphBuildError: computed.graphBuildError,
      context: {
        connectorTypes: {},
        connectorsManagementUrl: 'http://test/connectors',
        workflows: { workflows: {}, totalWorkflows: 0 },
        getPropertyHandler: () => null,
        esqlCallbacks: {},
        signal: abortController.signal,
      },
    });

    expect(results.some((result) => result.owner === 'esql-validation')).toBe(false);
    expect(results).toEqual(
      expect.arrayContaining([structuralResult, connectorResult, graphResult, workflowInputResult])
    );

    model.dispose();
  });

  it('returns no esql results when validation throws a non-abort error', async () => {
    mockValidateEsqlSteps.mockRejectedValueOnce(new Error('ES|QL region mapping failed'));

    const model = monaco.editor.createModel(yaml, 'yaml');

    const results = await collectFullWorkflowYamlValidationResults({
      yamlString: yaml,
      model,
      yamlDocument: computed.yamlDocument!,
      lineCounter: computed.yamlLineCounter!,
      workflowLookup: computed.workflowLookup,
      workflowGraph: computed.workflowGraph,
      workflowDefinition: computed.workflowDefinition ?? undefined,
      graphBuildError: computed.graphBuildError,
      context: {
        connectorTypes: {},
        connectorsManagementUrl: 'http://test/connectors',
        workflows: { workflows: {}, totalWorkflows: 0 },
        getPropertyHandler: () => null,
        esqlCallbacks: {},
      },
    });

    expect(results.some((result) => result.owner === 'esql-validation')).toBe(false);
    expect(results).toEqual(
      expect.arrayContaining([structuralResult, connectorResult, graphResult, workflowInputResult])
    );

    model.dispose();
  });
});
