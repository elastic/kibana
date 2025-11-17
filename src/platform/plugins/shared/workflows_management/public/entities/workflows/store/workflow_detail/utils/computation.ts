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
import {
  correctYamlSyntax,
  parseWorkflowYamlForAutocomplete,
} from '../../../../../../common/lib/yaml';
import type { ComputedData } from '../types';

export const performComputation = (
  yamlString: string,
  loadedDefinition?: WorkflowYaml
): ComputedData => {
  if (!yamlString) {
    return {
      yamlLineCounter: undefined,
      yamlDocument: undefined,
      workflowLookup: undefined,
      workflowGraph: undefined,
      workflowDefinition: undefined,
      computedFromYamlString: undefined,
    };
  }

  // Compute derived data
  // Parse YAML document from original yaml string
  // todo: use parseDocument once, not here plus inside parseWorkflowYamlToJSON
  const lineCounter = new LineCounter();
  const yamlDoc = YAML.parseDocument(yamlString, { lineCounter, keepSourceTokens: true });

  // use corrected yaml for schema parsing
  const correctedYamlString = correctYamlSyntax(yamlString);
  // Build workflow lookup
  const lookup = buildWorkflowLookup(yamlDoc, lineCounter);

  // parse workflow definition from yaml string if not provided
  let workflowDefinition = loadedDefinition;
  if (!workflowDefinition) {
    // Parse workflow JSON for graph creation
    const parsingResult = parseWorkflowYamlForAutocomplete(correctedYamlString);
    if (parsingResult.success) {
      workflowDefinition = parsingResult.data as WorkflowYaml;
    }
  }

  const graph = workflowDefinition
    ? WorkflowGraph.fromWorkflowDefinition(workflowDefinition)
    : undefined;

  return {
    yamlLineCounter: lineCounter,
    yamlDocument: yamlDoc,
    workflowLookup: lookup,
    workflowGraph: graph,
    workflowDefinition,
    computedFromYamlString: yamlString, // Track which yamlString was used for this computation
  };
};
