/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1".
 */

import type { WorkflowGraphAnchorRect } from './workflow_graph_actions_context';

/** Screen-space rect of an element — used to anchor the Actions menu. */
export const toAnchorRect = (el: Element): WorkflowGraphAnchorRect => {
  const { left, top, width, height } = el.getBoundingClientRect();
  return { left, top, width, height };
};
