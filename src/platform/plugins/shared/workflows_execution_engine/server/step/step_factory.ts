/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseStep } from '@kbn/workflows'; // Adjust path as needed
import { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import { StepBase } from './step_base';
// Import schema and inferred types
import { ConnectorExecutor } from '../connector_executor';
import { ConnectorStepImpl } from './connector_step';
// Import specific step implementations
// import { ForEachStepImpl } from './foreach-step'; // To be created
// import { IfStepImpl } from './if-step'; // To be created
// import { AtomicStepImpl } from './atomic-step'; // To be created
// import { ParallelStepImpl } from './parallel-step'; // To be created
// import { MergeStepImpl } from './merge-step'; // To be created

export class StepFactory {
  public create<TStep extends BaseStep>(
    step: TStep, // Use z.infer<typeof StepSchema> when fully defined
    contextManager: WorkflowContextManager,
    connectorExecutor: ConnectorExecutor // this is temporary, we will remove it when we have a proper connector executor
    // @ts-expect-error - TODO: fix this
  ): StepBase<TStep> {
    const stepType = (step as any).type; // Use a more type-safe way to determine step type if possible

    if (!stepType) {
      throw new Error('Step type is not defined for step: ' + JSON.stringify(step));
    }

    switch (stepType) {
      case 'foreach':
      // return new ForEachStepImpl(step as ForEachStep, contextManager);
      case 'if':
      // return new IfStepImpl(step as IfStep, contextManager);
      case 'atomic':
      // return new AtomicStepImpl(step as AtomicStep, contextManager);
      case 'parallel':
      // return new ParallelStepImpl(step as ParallelStep, contextManager);
      case 'merge':
      // return new MergeStepImpl(step as MergeStep, contextManager);
      default:
        return new ConnectorStepImpl(step as any, contextManager, connectorExecutor) as any;
    }
  }
}
