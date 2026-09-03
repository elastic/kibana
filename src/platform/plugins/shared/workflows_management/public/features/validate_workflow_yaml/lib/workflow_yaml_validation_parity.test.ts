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
  filterHighlightableValidationResults,
  validationResultsFingerprint,
} from '@kbn/workflows-yaml';
import { collectFullWorkflowYamlValidationResults } from './collect_full_workflow_yaml_validation_results';
import type { WorkflowYamlValidationContext } from './collect_full_workflow_yaml_validation_results';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';

jest.mock('../../../widgets/workflow_yaml_editor/lib/esql_validation/validate_esql_steps', () => ({
  validateEsqlSteps: jest.fn(async () => []),
}));

/** Broken YAML shared by editor and change-history preview validation paths. */
export const WORKFLOW_YAML_VALIDATION_PARITY_FIXTURE = [
  'name: test-workflow',
  'steps:',
  '  - name: duplicate_step',
  '    type: console',
  '    with:',
  '      message: first',
  '  - name: duplicate_step',
  '    type: console',
  '    with:',
  '      message: second',
].join('\n');

const testValidationContext: WorkflowYamlValidationContext = {
  connectorTypes: { status: 'ready', value: {} },
  connectorsManagementUrl: 'http://test/connectors',
  workflows: { workflows: {}, totalWorkflows: 0 },
  getPropertyHandler: () => null,
  esqlCallbacks: {},
};

const collectParityResults = async (yaml: string) => {
  const computed = performComputation(yaml);
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
    context: testValidationContext,
  });

  model.dispose();

  return filterHighlightableValidationResults(results);
};

describe('workflow_yaml_validation_parity', () => {
  it('returns the same fingerprint for repeated collectFull calls (editor/preview SSOT)', async () => {
    const firstResults = await collectParityResults(WORKFLOW_YAML_VALIDATION_PARITY_FIXTURE);
    const secondResults = await collectParityResults(WORKFLOW_YAML_VALIDATION_PARITY_FIXTURE);

    const firstFingerprint = validationResultsFingerprint(firstResults);
    const secondFingerprint = validationResultsFingerprint(secondResults);

    expect(firstFingerprint).toBe(secondFingerprint);
    expect(firstFingerprint.length).toBeGreaterThan(0);
    expect(firstResults.some((result) => result.message?.includes('duplicate_step'))).toBe(true);
  });

  it('matches the golden highlightable-validation fingerprint for the parity fixture', async () => {
    const results = await collectParityResults(WORKFLOW_YAML_VALIDATION_PARITY_FIXTURE);
    const fingerprint = validationResultsFingerprint(results);

    expect(fingerprint).toMatchInlineSnapshot(`
      "step-name-validation\u0000duplicateStepName\u0000error\u00003:11\u00003:25\u0000Step name \\"duplicate_step\\" is not unique. Found 2 steps with this name.
      step-name-validation\u0000duplicateStepName\u0000error\u00007:11\u00007:25\u0000Step name \\"duplicate_step\\" is not unique. Found 2 steps with this name."
    `);
  });
});
