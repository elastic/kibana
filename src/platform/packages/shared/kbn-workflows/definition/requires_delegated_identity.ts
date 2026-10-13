/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { visitNestedSteps } from './definition_utils';

import type { WorkflowYaml } from '../spec/schema';

const EXECUTE_STEP_TYPES = new Set(['workflow.execute', 'workflow.executeAsync']);

interface DelegatedIdentityCapableWorkflow {
  definition?: Pick<WorkflowYaml, 'steps' | 'settings'> | null;
}

type MaybeDelegatedIdentityCapableWorkflow = DelegatedIdentityCapableWorkflow | undefined;

/**
 * A workflow that dispatches children with `run-as-mode: inherit` and carries no
 * `settings.run_as` of its own can only execute as the delegated service account of a
 * parent run. A top-level run of such a workflow always fails at the first inherited step
 * ("Service account inheritance requires a parent executing as a service account"), and —
 * because workflow-level `settings.concurrency` keys the space with cancel-in-progress —
 * starting it by hand can cancel the space's in-flight scheduled run. Standalone runs
 * must be rejected up front instead.
 */
export const requiresDelegatedIdentity = (
  workflow: MaybeDelegatedIdentityCapableWorkflow
): boolean => {
  if (!workflow?.definition || workflow.definition.settings?.run_as) return false;
  let found = false;
  visitNestedSteps(workflow.definition.steps ?? [], ({ step }) => {
    if (found || !EXECUTE_STEP_TYPES.has(step.type)) return;
    if ('with' in step && (step.with as Record<string, unknown>)?.['run-as-mode'] === 'inherit') {
      found = true;
    }
  });
  return found;
};
