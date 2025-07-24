/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExitIfNode } from '@kbn/workflows';
import { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import { StepImplementation } from '../step_base';

export class ExitIfNodeImpl implements StepImplementation {
  constructor(private step: ExitIfNode, private contextManager: WorkflowContextManager) {}

  public run(): Promise<void> {
    return this.contextManager.finishStep(this.step.startNodeId);
  }
}
