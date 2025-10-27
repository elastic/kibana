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
import type { z } from '@kbn/zod';
import { buildWorkflowLookup } from './build_workflow_lookup';
import { parseWorkflowYamlToJSON } from '../../../../../../common/lib/yaml_utils';
import type { WorkflowZodSchemaLooseType } from '../../../../../../common/schema';
import type { WorkflowEditorState } from '../types';

export const performComputation = (
  yamlString: string | undefined,
  schemLoose: WorkflowZodSchemaLooseType
): WorkflowEditorState['computed'] | undefined => {
  if (!yamlString) {
    return;
  }

  // Compute derived data
  try {
    // Parse YAML document
    const lineCounter = new LineCounter();
    const yamlDoc = YAML.parseDocument(yamlString, { lineCounter, keepSourceTokens: true });

    // Parse workflow JSON for graph creation
    const parsingResult = parseWorkflowYamlToJSON(yamlString, schemLoose as z.ZodSchema);

    // Build workflow lookup
    const lookup = buildWorkflowLookup(yamlDoc, lineCounter);

    // Create workflow graph
    const parsedWorkflow = parsingResult.success ? parsingResult.data : undefined;
    const graph = parsedWorkflow ? WorkflowGraph.fromWorkflowDefinition(parsedWorkflow) : undefined;
    return {
      yamlLineCounter: lineCounter,
      yamlDocument: yamlDoc,
      workflowLookup: lookup,
      workflowGraph: graph,
      workflowDefinition: parsedWorkflow as WorkflowYaml,
    };
  } catch (e) {
    // Clear computed data on error
  }
};
