/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitNormalPathNode } from '@kbn/workflows/graph';
import type { IWorkflowExecutionRuntimeManager } from '@kbn/workflows-execution-engine-core';
import type { INodeImplementation } from '@kbn/workflows-execution-engine-core';

export class ExitNormalPathNodeImpl implements INodeImplementation {
  constructor(
    private node: ExitNormalPathNode,
    private wfExecutionRuntimeManager: IWorkflowExecutionRuntimeManager
  ) {}

  public run(): void {
    this.wfExecutionRuntimeManager.navigateToNode(this.node.exitOnFailureZoneNodeId);
  }
}
