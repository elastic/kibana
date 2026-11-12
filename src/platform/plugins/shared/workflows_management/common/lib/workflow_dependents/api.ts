/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CalledWorkflowImpact,
  DependentImpact,
  DependentsAnalysis,
  RemovalImpact,
  WorkflowReference,
} from './types';

/** True for an enabled caller that a save breaks; a turned-off caller has no runs to break. */
export const isBreakingRun = ({
  enabled,
  status,
}: Pick<DependentImpact, 'enabled' | 'status'>): boolean => enabled && status === 'breaking';

/** Builds the internal route that analyzes how a draft of a workflow affects connected workflows. */
export const getWorkflowDependentsImpactPath = (workflowId: string): string =>
  `/internal/workflows/workflow/${encodeURIComponent(workflowId)}/_dependents_impact`;

export const WORKFLOW_DEPENDENTS_IMPACT_ROUTE =
  '/internal/workflows/workflow/{id}/_dependents_impact';

export interface WorkflowDependentsImpactRequestBody {
  /** Draft YAML to analyze; the saved version is analyzed when omitted. */
  yaml?: string;
}

export interface WorkflowDependentsImpactResponse {
  /** Workflows that run this one, graded against the draft. */
  analysis: DependentsAnalysis;
  /** Workflows this one runs, graded against their saved versions. */
  calledWorkflows: CalledWorkflowImpact[];
}

/** Summary of the callers a save broke, returned by the update workflow route. */
export interface WorkflowSaveDependentsImpact {
  breaking: WorkflowReference[];
  /** Workflows that fail or lose data because they run one of the `breaking` workflows. */
  indirectBreaking: number;
}

/** Internal route that lists what fails when workflows are turned off or deleted. */
export const WORKFLOW_REMOVAL_IMPACT_ROUTE = '/internal/workflows/_removal_impact';

/** Upper bound of workflow IDs one removal impact request checks, matching bulk actions. */
export const MAX_REMOVAL_IMPACT_IDS = 1000;

export interface WorkflowRemovalImpactRequestBody {
  ids: string[];
}

export type WorkflowRemovalImpactResponse = RemovalImpact;
