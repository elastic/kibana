/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { WorkflowContext, WorkflowYaml } from '@kbn/workflows';
import { getStepId } from '@kbn/workflows';
import _ from 'lodash';
import { getAllPredecessors } from '../../../shared/lib/graph_utils';
import type { WorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { EventSchema, getOutputSchemaForStepType } from '../../../../common/schema';
import { getSchemaAtPath, inferZodType } from '../../../../common/lib/zod_utils';

function getRootContextSchema(definition: WorkflowYaml) {
  return z.object({
    spaceId: z.string(),
    workflowRunId: z.string(),
    now: z.date(),
    event: EventSchema,
    steps: z.object({}),
    consts: z.object({
      ...Object.fromEntries(
        Object.entries(definition.consts ?? {}).map(([key, value]) => [key, inferZodType(value)])
      ),
    }),
  });
}

function getAvailableOutputsSchema(
  definition: WorkflowYaml,
  workflowGraph: WorkflowGraph,
  stepName: string
) {
  const predecessors = getAllPredecessors(workflowGraph, getStepId(stepName));

  if (predecessors.length === 0) {
    return z.object({});
  }

  let contextSchema = z.object({});
  predecessors.forEach((predecessor) => {
    const node = workflowGraph.node(predecessor);
    // Excluding triggers from the context for now. Maybe they should be included under 'triggers' key?
    if (node.type === 'trigger') {
      return;
    }
    contextSchema = contextSchema.extend({
      [predecessor]: z.object({
        output: getOutputSchemaForStepType(node.label.stepType),
      }),
    });
  });
  return contextSchema;
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

export function getContextSchemaForPath(
  definition: WorkflowYaml,
  workflowGraph: WorkflowGraph,
  path: Array<string | number>
) {
  const rootContextSchema = getRootContextSchema(definition);
  const nearestStepPath = getNearestStepPath(path);
  if (!nearestStepPath) {
    return rootContextSchema;
  }
  const nearestStep = _.get(definition, nearestStepPath);
  let contextSchema = rootContextSchema;
  if (!nearestStep) {
    throw new Error(`Invalid path: ${path.join('.')}`);
  }
  const outputsSchema = getAvailableOutputsSchema(definition, workflowGraph, nearestStep.name);
  if (Object.keys(outputsSchema.shape).length > 0) {
    contextSchema = contextSchema.extend({
      steps: outputsSchema,
    });
  }
  if (nearestStep.foreach) {
    // TODO: add foreach item type
    let itemSchema: z.ZodType = z.any();
    if (nearestStep.foreach.startsWith('steps.') || nearestStep.foreach.startsWith('consts.')) {
      const schema = getSchemaAtPath(contextSchema, nearestStep.foreach);
      if (schema instanceof z.ZodArray) {
        itemSchema = schema.element;
      }
    }
    contextSchema = contextSchema.extend({
      foreach: z.object({ item: itemSchema }),
    });
  }
  return contextSchema satisfies z.ZodType<WorkflowContext>;
}
