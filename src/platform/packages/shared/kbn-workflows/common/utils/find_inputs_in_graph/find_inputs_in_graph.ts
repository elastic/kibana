/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AtomicGraphNode, EnterForeachNode, EnterIfNode, WorkflowGraph } from '../../../graph';
import { extractPropertyPathsFromKql } from '../extract_property_paths_from_kql/extract_property_paths_from_kql';
import { extractTemplateVariables } from '../extract_template_variables/extract_template_variables';

function scanValueForVariablesRecursively(value: unknown): string[] {
  if (typeof value === 'string') {
    return extractTemplateVariables(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => scanValueForVariablesRecursively(item));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value as object).flatMap((v) => scanValueForVariablesRecursively(v));
  }

  return [];
}

export function findInputsInGraph(workflowGraph: WorkflowGraph): Record<string, string[]> {
  const inputsInSteps: Record<string, string[]> = {};
  const nodes = workflowGraph.topologicalOrder.map((nodeId) => workflowGraph.getNode(nodeId));

  for (const node of nodes) {
    let stepInputsKey;
    let stepInputs: string[] = [];
    const isInForeach = workflowGraph
      .getNodeStack(node.id)
      .some((nodeId) => workflowGraph.getNode(nodeId).type === 'enter-foreach');

    if ((node as EnterIfNode).type === 'enter-if') {
      const ifNode = node as EnterIfNode;
      const ifInput = ifNode.configuration.condition;
      const kqlVariables = extractPropertyPathsFromKql(ifInput);
      kqlVariables.forEach((variable) => stepInputs.push(variable));
      stepInputsKey = ifNode.stepId;
    }
    if ((node as EnterForeachNode).type === 'enter-foreach') {
      const enterForeachNode = node as EnterForeachNode;
      const foreachInput = (node as EnterForeachNode).configuration.foreach;
      let shouldInclude = true;

      if (typeof foreachInput === 'string') {
        try {
          shouldInclude = !Array.isArray(JSON.parse(foreachInput));
        } catch {
          // If parsing fails, keep it as a string
        }
      }

      if (shouldInclude) {
        // Extract template variables from the foreach expression (e.g., "{{ inputs.people }}" -> "inputs.people")
        const foreachVariables = scanValueForVariablesRecursively(foreachInput);
        if (foreachVariables.length > 0) {
          stepInputs.push(...foreachVariables);
        }

        stepInputsKey = enterForeachNode.stepId;
      }
    } else {
      // We try to scan the whole node, because otherwise, we would need a special case for each node type such as http, kibana, elasticsearch, etc
      // Not good, most likely and other nodes will need to be subset of atomic node, or something else
      const genericNode = node as AtomicGraphNode;
      stepInputsKey = genericNode.stepId;
      stepInputs.push(...scanValueForVariablesRecursively(genericNode));
    }

    if (isInForeach) {
      stepInputs = stepInputs.filter((input) => !input.startsWith('foreach.'));
    }

    if (stepInputsKey && stepInputs.length) {
      inputsInSteps[stepInputsKey] = stepInputs;
    }
  }

  return inputsInSteps;
}
