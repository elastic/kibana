/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '@kbn/workflows';

import type { IStepExecutionRuntime } from './step_execution_runtime';

/**
 * Factory collaborator used by flow-control nodes that need to create a
 * child step runtime (e.g. when unwinding scopes on loop-break / loop-continue
 * or when a workflow-level timeout creates a fresh scope runtime).
 *
 * The plugin's concrete `StepExecutionRuntimeFactory` also wires up
 * ES clients, telemetry, and the logger chain — none of that leaks here.
 */
export interface IStepExecutionRuntimeFactory {
  createStepExecutionRuntime(params: {
    nodeId: string;
    stackFrames: StackFrame[];
  }): IStepExecutionRuntime;
}
