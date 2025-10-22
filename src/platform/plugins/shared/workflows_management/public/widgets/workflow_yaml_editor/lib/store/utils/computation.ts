/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnyAction, Dispatch, MiddlewareAPI } from '@reduxjs/toolkit';
import YAML, { LineCounter } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { buildWorkflowLookup } from './build_workflow_lookup';
import { parseWorkflowYamlToJSON } from '../../../../../../common/lib/yaml_utils';
import {
  getCachedDynamicConnectorTypes,
  getWorkflowZodSchemaLoose,
} from '../../../../../../common/schema';
import { _setComputedDataInternal, clearComputedData } from '../slice';
import type { RootState } from '../types';

export const performComputation = (
  store: MiddlewareAPI<Dispatch<AnyAction>, RootState>,
  yamlString: string | undefined
) => {
  if (!yamlString) {
    store.dispatch(clearComputedData());
    return;
  }

  // Compute derived data
  try {
    // Parse YAML document
    const lineCounter = new LineCounter();
    const yamlDoc = YAML.parseDocument(yamlString, { lineCounter });

    // Parse workflow JSON for graph creation
    const dynamicConnectorTypes = getCachedDynamicConnectorTypes() || {};
    const parsingResult = parseWorkflowYamlToJSON(
      yamlString,
      getWorkflowZodSchemaLoose(dynamicConnectorTypes)
    );

    // Build workflow lookup
    const lookup = buildWorkflowLookup(yamlDoc, lineCounter);

    // Create workflow graph
    const parsedWorkflow = parsingResult.success ? parsingResult.data : undefined;
    const graph = parsedWorkflow ? WorkflowGraph.fromWorkflowDefinition(parsedWorkflow) : undefined;

    // Dispatch computed data
    store.dispatch(
      _setComputedDataInternal({
        yamlLineCounter: lineCounter,
        yamlDocument: yamlDoc,
        workflowLookup: lookup,
        workflowGraph: graph,
        workflowDefinition: parsedWorkflow as WorkflowYaml,
      })
    );
  } catch (e) {
    // console.error('Error performing computation', e);
    // Clear computed data on error
    store.dispatch(clearComputedData());
  }
};
