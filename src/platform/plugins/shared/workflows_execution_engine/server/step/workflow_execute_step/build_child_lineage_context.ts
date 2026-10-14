/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isTopLevelWorkflowExecution } from '@kbn/workflows';
import { hasRootWorkflowExecutionId } from '../../utils';

/** Root of a composition chain, carried in a child execution's context bag for telemetry. */
export interface RootWorkflowLineage {
  readonly rootWorkflowExecutionId: string;
}

export interface ChildLineageParent {
  readonly context?: Record<string, unknown>;
  readonly id: string;
  readonly triggeredBy?: string;
}

/**
 * Root lineage key to spread into a child execution's context: the parent itself when it is top
 * level, else the parent's stored root, else nothing (a pre-upgrade child has no known root).
 */
export const buildChildLineageContext = ({
  context,
  id,
  triggeredBy,
}: ChildLineageParent): RootWorkflowLineage | Record<string, never> => {
  if (isTopLevelWorkflowExecution({ triggeredBy })) {
    return { rootWorkflowExecutionId: id };
  }

  return hasRootWorkflowExecutionId(context)
    ? { rootWorkflowExecutionId: context.rootWorkflowExecutionId }
    : {};
};
