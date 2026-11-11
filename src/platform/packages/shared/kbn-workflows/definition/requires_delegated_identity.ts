/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseStep, WorkflowYaml } from '../spec/schema';

const EXECUTE_STEP_TYPES = new Set(['workflow.execute', 'workflow.executeAsync']);

interface DelegatedIdentityCapableWorkflow {
  definition?: Pick<WorkflowYaml, 'steps' | 'settings'> | null;
}

export type MaybeDelegatedIdentityCapableWorkflow = DelegatedIdentityCapableWorkflow | undefined;

type WorkflowStepLike = Pick<BaseStep, 'type'> & {
  if?: unknown;
  with?: unknown;
};

const inheritsIdentity = (step: WorkflowStepLike): boolean =>
  EXECUTE_STEP_TYPES.has(step.type) &&
  (step.with as Record<string, unknown> | undefined)?.['run-as-mode'] === 'inherit';

/**
 * Whether some step dispatching a child with `run-as-mode: inherit` runs in every
 * execution — i.e. sits at the top level with no step-level `if` guard. Any nesting
 * already implies a condition: if/else and switch arms, foreach/while bodies (zero
 * iterations run zero times), parallel branches, and failure-handler fallbacks all
 * execute only at runtime's discretion. Only such an unconditional inherit dooms a
 * standalone run; a conditional one may never execute (e.g. `system-create-proposal`'s
 * approver path runs without inheritance), and blocking it would reject a valid run.
 */
const hasUnconditionalInherit = (steps: WorkflowStepLike[]): boolean => {
  for (const step of steps) {
    if (inheritsIdentity(step) && step.if === undefined) {
      return true;
    }
  }
  return false;
};

/**
 * A workflow that always dispatches children with `run-as-mode: inherit` while carrying
 * no `settings.run_as` of its own can only execute as the delegated service account of
 * a parent run, so a standalone run is doomed — and starting one by hand can cancel the
 * space's in-flight scheduled run via cancel-in-progress. Reject such runs up front.
 * Conditionally-reached inherits (branches, loops, failure fallbacks) do not doom the
 * run and are deliberately not grounds for rejection.
 */
export const requiresDelegatedIdentity = (
  workflow: MaybeDelegatedIdentityCapableWorkflow
): boolean => {
  if (!workflow?.definition || workflow.definition.settings?.run_as) return false;
  return hasUnconditionalInherit(workflow.definition.steps ?? []);
};
