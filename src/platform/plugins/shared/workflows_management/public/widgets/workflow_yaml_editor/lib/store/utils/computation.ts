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
import { buildWorkflowLookup } from './build_workflow_lookup';
import { correctYamlSyntax } from '../../../../../../common/lib/yaml/correct_yaml_syntax';
import { parseWorkflowYamlForAutocomplete } from '../../../../../../common/lib/yaml/parse_workflow_yaml_for_autocomplete';
import type { WorkflowZodSchemaLooseType } from '../../../../../../common/schema';
import type { ComputedData } from '../types';

export const performComputation = (
  _yamlString: string | undefined,
  schemaLoose: WorkflowZodSchemaLooseType
): ComputedData | undefined => {
  if (!_yamlString) {
    return;
  }

  // Compute derived data
  try {
    const yamlString = correctYamlSyntax(_yamlString);
    // Parse YAML document
    // todo: try to close unclosed quotes, wrap special characters like "@" with quotes before dangerously parsing
    // todo: use parseDocument once, not here plus inside parseWorkflowYamlToJSON
    const lineCounter = new LineCounter();
    const yamlDoc = YAML.parseDocument(yamlString, { lineCounter, keepSourceTokens: true });

    // Parse workflow JSON for graph creation
    const parsingResult = parseWorkflowYamlForAutocomplete(yamlString);
    // const dangerouslyParseResult = dangerouslyParseWorkflowYamlToJSON(yamlString);

    if (!parsingResult.success) {
      console.error('Error parsing workflow YAML', parsingResult.error);
    }

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
    console.error('Error performing computation', e);
    // Clear computed data on error
  }
};
