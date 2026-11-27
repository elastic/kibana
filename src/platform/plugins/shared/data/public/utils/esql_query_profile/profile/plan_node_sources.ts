/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlProfilePlan } from '@kbn/es-types';
import type { PlanNodeSource } from './types';
import { isRecord } from '../shared/json_helpers';

/** Plan node ids are only unique on the node that planned them, so a node is named with its id. */
export const planNodeKey = (nodeName: string | undefined, planNodeId: string): string =>
  `${nodeName ?? ''}|${planNodeId}`;

const readSource = (value: unknown): PlanNodeSource | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const { line, column, text, view } = value;
  // A node from a view points into the view's own text, not into the query.
  if (view != null || typeof line !== 'number' || typeof column !== 'number') {
    return undefined;
  }
  return typeof text === 'string' && text.length > 0 ? { line, column, text } : undefined;
};

const collectSources = (
  node: unknown,
  nodeName: string | undefined,
  sources: Record<string, PlanNodeSource>
): void => {
  if (!isRecord(node)) {
    return;
  }
  const source = readSource(node.source);
  if (typeof node.id === 'string' && source) {
    sources[planNodeKey(nodeName, node.id)] = source;
  }
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => collectSources(child, nodeName, sources));
  }
};

/** Where each node of the plans comes from in the query. Nodes the planner made have no source. */
export const readPlanNodeSources = (plans: EsqlProfilePlan[]): Record<string, PlanNodeSource> => {
  const sources: Record<string, PlanNodeSource> = {};
  plans.forEach((plan) => collectSources(plan.plan_json, plan.node_name, sources));
  return sources;
};
