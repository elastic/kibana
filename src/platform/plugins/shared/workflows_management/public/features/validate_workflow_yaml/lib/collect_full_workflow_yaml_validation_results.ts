/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, LineCounter } from 'yaml';
import type { monaco } from '@kbn/code-editor';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ConnectorTypeInfo, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { collectAllConnectorIds } from './collect_all_connector_ids';
import { collectAllStepPropertyItems } from './collect_all_step_property_items';
import { runWorkflowYamlValidations } from './run_workflow_yaml_validations';
import { validateConnectorIds } from './validate_connector_ids';
import { validateGraphBuild } from './validate_graph_build';
import { validateStepProperties } from './validate_step_properties';
import { validateWorkflowInputs } from './validate_workflow_inputs';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';
import type { GraphBuildErrorInfo } from '../../../entities/workflows/store/workflow_detail/types';
import type { WorkflowLookup } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { GetStepPropertyHandler } from '../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/step_property/get_step_property_suggestions';
import { validateEsqlSteps } from '../../../widgets/workflow_yaml_editor/lib/esql_validation/validate_esql_steps';
import type { YamlValidationResult } from '../model/types';

export interface WorkflowYamlValidationContext {
  connectorTypes: Record<string, ConnectorTypeInfo> | null;
  connectorsManagementUrl: string;
  workflows: WorkflowsResponse | null;
  getPropertyHandler: GetStepPropertyHandler;
  esqlCallbacks: ESQLCallbacks;
  signal?: AbortSignal;
}

export interface CollectFullWorkflowYamlValidationResultsParams {
  yamlString: string;
  model: monaco.editor.ITextModel;
  yamlDocument: Document;
  lineCounter: LineCounter;
  workflowLookup?: WorkflowLookup;
  workflowGraph?: WorkflowGraph;
  workflowDefinition?: WorkflowYaml;
  graphBuildError?: GraphBuildErrorInfo;
  context: WorkflowYamlValidationContext;
}

/**
 * Shared custom validation pipeline for the live workflow editor and change-history preview.
 */
export async function collectFullWorkflowYamlValidationResults({
  yamlString,
  model,
  yamlDocument,
  lineCounter,
  workflowLookup,
  workflowGraph,
  workflowDefinition,
  graphBuildError,
  context,
}: CollectFullWorkflowYamlValidationResultsParams): Promise<YamlValidationResult[]> {
  const {
    connectorTypes,
    connectorsManagementUrl,
    workflows,
    getPropertyHandler,
    esqlCallbacks,
    signal,
  } = context;

  const connectorIdItems = collectAllConnectorIds(yamlDocument, lineCounter);
  const stepPropertyItems =
    workflowLookup && lineCounter
      ? collectAllStepPropertyItems(workflowLookup, lineCounter, getPropertyHandler)
      : [];

  const results: YamlValidationResult[] = runWorkflowYamlValidations({
    yamlString,
    model,
    yamlDocument,
    lineCounter,
    workflowLookup,
    workflowGraph,
    workflowDefinition,
  });

  results.push(
    ...validateConnectorIds(connectorIdItems, connectorTypes, connectorsManagementUrl),
    ...validateGraphBuild(graphBuildError, workflowLookup, lineCounter)
  );

  if (stepPropertyItems.length > 0) {
    results.push(...(await validateStepProperties(stepPropertyItems)));
  }

  if (workflowLookup && lineCounter) {
    results.push(...validateWorkflowInputs(workflowLookup, workflows, lineCounter));

    const esqlSignal = signal ?? new AbortController().signal;
    results.push(
      ...(await collectEsqlValidationResults(
        workflowLookup,
        lineCounter,
        model,
        esqlCallbacks,
        esqlSignal
      ))
    );
  }

  return results;
}

async function collectEsqlValidationResults(
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter,
  model: monaco.editor.ITextModel,
  esqlCallbacks: ESQLCallbacks,
  signal: AbortSignal
): Promise<YamlValidationResult[]> {
  try {
    return await validateEsqlSteps(workflowLookup, lineCounter, model, esqlCallbacks, signal);
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      return [];
    }

    // Degrade to no ES|QL markers on unexpected failures so structural/custom validators
    // still publish. Matches pre-SSOT `validateEsqlSteps(...).catch(() => [])` in the editor.
    return [];
  }
}
