/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';

/** The run a guard is asked to admit. Only saved (non-ephemeral) workflows are checked. */
export interface WorkflowExecutionAdmissionRequest {
  workflowId: string;
  spaceId: string;
  /** How the run was started, e.g. `manual`, `scheduled`, `alert`, `workflow-step`. */
  triggeredBy: string;
}

export type WorkflowExecutionAdmissionDecision =
  | { admitted: true }
  | { admitted: false; guardId: string; reason: string };

/**
 * Decides whether a workflow run may start. Guards run before the execution document is
 * created, so a rejected run consumes nothing; they should be cheap and cache what they read.
 */
export type WorkflowExecutionAdmissionGuard = (
  request: WorkflowExecutionAdmissionRequest
) => Promise<{ admitted: true } | { admitted: false; reason: string }>;

export class ExecutionAdmissionRegistry {
  private readonly guards = new Map<string, WorkflowExecutionAdmissionGuard>();
  private frozen = false;

  constructor(private readonly logger: Logger) {}

  register(guardId: string, guard: WorkflowExecutionAdmissionGuard): void {
    if (this.frozen) {
      throw new Error(
        `Cannot register execution admission guard "${guardId}" after the setup phase`
      );
    }
    if (this.guards.has(guardId)) {
      throw new Error(`Execution admission guard "${guardId}" is already registered`);
    }
    this.guards.set(guardId, guard);
  }

  freeze(): void {
    this.frozen = true;
  }

  /**
   * Runs every guard and returns the first rejection. A guard that throws admits the run:
   * guards enforce soft policy (such as spend budgets) and must not take workflows down
   * when their own backing store is unavailable.
   */
  async check(
    request: WorkflowExecutionAdmissionRequest
  ): Promise<WorkflowExecutionAdmissionDecision> {
    for (const [guardId, guard] of this.guards) {
      try {
        const decision = await guard(request);
        if (!decision.admitted) {
          return { admitted: false, guardId, reason: decision.reason };
        }
      } catch (error) {
        this.logger.warn(
          `Execution admission guard "${guardId}" failed for workflow "${
            request.workflowId
          }" in space "${request.spaceId}"; admitting the run: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
    return { admitted: true };
  }
}
