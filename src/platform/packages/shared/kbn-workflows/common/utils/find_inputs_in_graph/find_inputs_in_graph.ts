/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowGraph } from '../../../graph';
import { extractTemplateVariables } from '../extract_template_variables/extract_template_variables';
import { extractPropertyPathsFromKql } from '../extract_property_paths_from_kql/extract_property_paths_from_kql';

import type { AtomicGraphNode, EnterForeachNode, EnterIfNode } from '../../../graph';

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

      try {
        shouldInclude = !Array.isArray(JSON.parse(foreachInput));
      } catch {
        // If parsing fails, keep it as a string
      }

      if (shouldInclude) {
        stepInputs.push((node as EnterForeachNode).configuration.foreach);
        stepInputsKey = enterForeachNode.stepId;
      }
    }
    if ((node as AtomicGraphNode).type === 'atomic') {
      const atomicNode = node as AtomicGraphNode;
      stepInputsKey = atomicNode.stepId;
      Object.values(atomicNode.configuration.with).forEach((input) => {
        if (typeof input !== 'string') {
          return;
        }

        extractTemplateVariables(input).forEach((variable) => stepInputs.push(variable));
      });
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
