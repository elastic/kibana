/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isTopLevelWorkflowExecution } from '@kbn/workflows';
import type { ExecutionChainHop } from '../../utils';
import { hasExecutionChain, hasRootWorkflowExecutionId, toExecutionChainHop } from '../../utils';

/**
 * Lineage carried in a child execution's context bag for telemetry: the root of its composition
 * chain, and every ancestor from the root down to its direct parent.
 */
export interface ChildLineageContext {
  readonly executionChain?: readonly ExecutionChainHop[];
  readonly rootWorkflowExecutionId?: string;
}

export interface ChildLineageParent {
  readonly context?: Record<string, unknown>;
  readonly id: string;
  readonly triggeredBy?: string;
  readonly workflowId: string;
}

export interface BuildChildLineageContextParams {
  /** How the parent invokes this child: `workflow.execute` (sync) or `workflow.executeAsync`. */
  readonly invocation: ExecutionChainHop['invocation'];
  readonly parent: ChildLineageParent;
}

/**
 * Lineage keys to spread into a child execution's context. A top-level parent is the root and the
 * chain's only hop. A child parent passes on its stored root and chain, with itself appended to the
 * chain; either is left out when the parent has none stored (it started before they were recorded),
 * so a partial chain is never written.
 */
export const buildChildLineageContext = ({
  invocation,
  parent: { context, id, triggeredBy, workflowId },
}: BuildChildLineageContextParams): ChildLineageContext => {
  const hop: ExecutionChainHop = { executionId: id, invocation, workflowId };

  if (isTopLevelWorkflowExecution({ triggeredBy })) {
    return { executionChain: [hop], rootWorkflowExecutionId: id };
  }

  return {
    ...(hasExecutionChain(context)
      ? { executionChain: [...context.executionChain.map(toExecutionChainHop), hop] }
      : {}),
    ...(hasRootWorkflowExecutionId(context)
      ? { rootWorkflowExecutionId: context.rootWorkflowExecutionId }
      : {}),
  };
};
