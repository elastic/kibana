/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowYaml, getStepId } from '@kbn/workflows';
import _ from 'lodash';
import { getAllPredecessors } from '../../../shared/lib/graph_utils';
import { WorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { CurrentStepContext } from '../model/types';

function getRootContext(definition: WorkflowYaml): CurrentStepContext {
  return {
    consts: definition.workflow.consts ?? {},
    secrets: {},
    steps: {},
  };
}

function getOutputSchema(stepType: string) {
  // TODO: get output schema for connector
  if (stepType === 'console.log') {
    return {
      message: '',
    };
  }
  return {};
}

function getAvailableOutputs(
  definition: WorkflowYaml,
  workflowGraph: WorkflowGraph,
  stepName: string
) {
  const predecessors = getAllPredecessors(workflowGraph, getStepId(stepName));

  if (predecessors.length === 0) {
    return {};
  }

  return predecessors?.reduce((acc, predecessor) => {
    const node = workflowGraph.node(predecessor);
    // Excluding triggers from the context for now. Maybe they should be included under 'triggers' key?
    if (node.type === 'trigger') {
      return acc;
    }
    return {
      ...acc,
      [predecessor]: {
        output: getOutputSchema(node.type),
      },
    };
  }, {});
}

export function getNearestStepPath(path: Array<string | number>) {
  const reversedPath = [...path].reverse();
  const stepsIndex = reversedPath.findIndex((p) => p === 'steps' || p === 'else');
  if (stepsIndex === -1) {
    return null;
  }
  if (stepsIndex === 0) {
    return null;
  }
  return path.slice(0, path.length - stepsIndex + 1);
}

export function getContextForPath(
  definition: WorkflowYaml,
  workflowGraph: WorkflowGraph,
  path: Array<string | number>
): CurrentStepContext {
  const rootContext = getRootContext(definition);
  const nearestStepPath = getNearestStepPath(path);
  if (!nearestStepPath) {
    return rootContext;
  }
  const nearestStep = _.get(definition, nearestStepPath);
  if (!nearestStep) {
    throw new Error(`Invalid path: ${path.join('.')}`);
  }
  return {
    ...rootContext,
    steps: getAvailableOutputs(definition, workflowGraph, nearestStep.name) ?? {},
  };
}
