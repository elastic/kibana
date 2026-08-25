/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Late-bound HITL lifecycle auditor. Registered by workflows_management at start
 * so the engine stays free of a `security` dependency while still emitting
 * security-audit events through {@link WorkflowManagementAuditLog}.
 */

export type HitlLifecycleEvent =
  | {
      type: 'waiting';
      executionId: string;
      stepExecutionId?: string;
      stepType?: string;
    }
  | {
      type: 'timed_out';
      executionId: string;
      stepExecutionId?: string;
      stepType?: string;
    }
  | {
      type: 'canceled';
      executionId: string;
      stepExecutionId?: string;
    };

export type HitlLifecycleAuditor = (event: HitlLifecycleEvent) => void;

let hitlLifecycleAuditor: HitlLifecycleAuditor | undefined;

/**
 * Registers the late-bound HITL lifecycle auditor. Returns a disposer that
 * clears the registration only if this auditor is still the active one.
 */
export const registerHitlLifecycleAuditor = (auditor: HitlLifecycleAuditor): (() => void) => {
  hitlLifecycleAuditor = auditor;
  return () => {
    if (hitlLifecycleAuditor === auditor) {
      hitlLifecycleAuditor = undefined;
    }
  };
};

export const emitHitlLifecycle = (event: HitlLifecycleEvent): void => {
  try {
    hitlLifecycleAuditor?.(event);
  } catch {
    // Best-effort: never let audit affect workflow execution.
  }
};
