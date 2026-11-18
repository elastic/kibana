/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformWorkflowToGraph } from '@kbn/workflows';
import type { LayoutDirection, WorkflowYaml } from '@kbn/workflows';
import { computeWorkflowLayout } from './workflow_layout_pipeline';

export interface WorkflowGraphSize {
  readonly width: number;
  readonly height: number;
}

/** The size of the workflow graph laid out in `direction`, at zoom 1; undefined when it has no nodes or cannot be laid out. */
export const getWorkflowGraphSize = (
  workflow: WorkflowYaml,
  direction: LayoutDirection
): WorkflowGraphSize | undefined => {
  let nodes: ReturnType<typeof computeWorkflowLayout>['nodes'];
  try {
    ({ nodes } = computeWorkflowLayout(transformWorkflowToGraph(workflow), { direction }));
  } catch {
    return undefined;
  }
  if (nodes.length === 0) return undefined;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y, width, height } of nodes) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }
  return { width: maxX - minX, height: maxY - minY };
};
