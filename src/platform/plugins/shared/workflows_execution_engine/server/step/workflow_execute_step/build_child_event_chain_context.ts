/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';

/**
 * Event chain a child execution inherits from its parent. Kept apart from `context.event`
 * because child templates read `event`.
 */
export interface ChildEventChainContext {
  readonly parentEventChain: {
    readonly eventChainDepth?: number;
    readonly eventChainVisitedWorkflowIds: readonly string[];
  };
}

/**
 * Context keys that let a child execution continue its parent's event chain, with the parent
 * marked as visited, so an event emitted by the child cannot re-trigger the parent.
 */
export const buildChildEventChainContext = ({
  eventChainDepth,
  eventChainVisitedWorkflowIds = [],
  workflowId,
}: Pick<
  EsWorkflowExecution,
  'eventChainDepth' | 'eventChainVisitedWorkflowIds' | 'workflowId'
>): ChildEventChainContext => ({
  parentEventChain: {
    ...(eventChainDepth !== undefined ? { eventChainDepth } : {}),
    eventChainVisitedWorkflowIds: [...eventChainVisitedWorkflowIds, workflowId],
  },
});
