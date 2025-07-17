/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StepBase } from './step-base';
import { WorkflowContextManager } from '../workflow-context-manager/workflow-context-manager';
import { z } from '@kbn/zod';
// Import schema and inferred types
import {
    ForEachStepSchema,
    IfStepSchema,
    ParallelStepSchema,
    MergeStepSchema,
    BaseConnectorStepSchema,
} from '@kbn/workflows'; // Adjust path as needed
import { ConnectorExecutor } from '../connector-executor';
import { ConnectorStep } from './connector-step';
// Import specific step implementations
// import { ForEachStepImpl } from './foreach-step'; // To be created
// import { IfStepImpl } from './if-step'; // To be created
// import { AtomicStepImpl } from './atomic-step'; // To be created
// import { ParallelStepImpl } from './parallel-step'; // To be created
// import { MergeStepImpl } from './merge-step'; // To be created

type ForEachStep = z.infer<typeof ForEachStepSchema>;
type IfStep = z.infer<typeof IfStepSchema>;
type ParallelStep = z.infer<typeof ParallelStepSchema>;
type MergeStep = z.infer<typeof MergeStepSchema>;
type ConnectorStep = z.infer<typeof BaseConnectorStepSchema>;

export class StepFactory {
    public static create(
        step: any, // Use z.infer<typeof StepSchema> when fully defined
        contextManager: WorkflowContextManager,
        connectorExecutor: ConnectorExecutor, // this is temporary, we will remove it when we have a proper connector executor
    ): StepBase {
        switch (step.type) {
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
                return new ConnectorStep(step, contextManager, connectorExecutor);
        }
    }
}