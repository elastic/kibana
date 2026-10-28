/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RemoteStepContext, RemoteWorkflowStep } from './tokens';

type StepFactory = () => RemoteWorkflowStep;

/**
 * Executor-local catalogue. The host constructs one per worker with the contributed step factories.
 * Unknown step types fail here; they are not executed on the coordinator.
 */
export class WorkflowStepCatalog {
  constructor(private readonly steps: ReadonlyMap<string, StepFactory>) {}

  supports(stepType: string): boolean {
    return this.steps.has(stepType);
  }

  async run(
    stepType: string,
    scopeId: string,
    input: unknown,
    context: RemoteStepContext
  ): Promise<unknown> {
    const create = this.steps.get(stepType);
    if (!create) {
      throw new Error(
        `Unsupported remote step type "${stepType}". Experimental remote execution only runs steps registered for this anchor.`
      );
    }
    return create().run(scopeId, input, context);
  }
}
