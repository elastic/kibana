/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import type { JobState } from './buildkite';

export const PR_CI_EARLY_START_PILOT_LABEL = 'ci:pilot:early-start';
export const PR_CI_EARLY_START_COMPAT_BETA_LABEL = 'ci:beta-faster-pr-build';

export const PR_CI_EARLY_START_ROLLOUT_PERCENT_ENV = 'PR_CI_EARLY_START_ROLLOUT_PERCENT';

export const PR_CI_EARLY_START_ENABLED_ENV = 'PR_CI_EARLY_START_ENABLED';
export const PR_CI_EARLY_START_DECISION_REASON_ENV = 'PR_CI_EARLY_START_DECISION_REASON';
export const PR_CI_EARLY_START_ROLLOUT_BUCKET_ENV = 'PR_CI_EARLY_START_ROLLOUT_BUCKET';

export const PR_CI_CANCELABLE_ON_GATE_FAILURE_ENV = 'PR_CI_CANCELABLE_ON_GATE_FAILURE';
export const PR_CI_CANCELABLE_COMMAND_PREFIX = `${PR_CI_CANCELABLE_ON_GATE_FAILURE_ENV}=true`;
export const PR_CI_CANCELABLE_METADATA_SUFFIX = 'pr_ci_cancelable';

const PR_CI_REQUIRED_NON_GATE_DEPENDENCIES = new Set(['build', 'build_scout_tests']);

const PR_CI_EARLY_START_OPT_IN_LABELS = new Set([
  PR_CI_EARLY_START_PILOT_LABEL,
  PR_CI_EARLY_START_COMPAT_BETA_LABEL,
]);

export const PR_CI_GATE_KEYS = [
  'quick_checks',
  'checks',
  'linting',
  'linting_with_types',
  'check_types',
  'check_oas_snapshot',
] as const;

const PR_CI_GATE_KEYS_SET = new Set<string>(PR_CI_GATE_KEYS);

const PR_CI_GATE_FAILURE_STATES = new Set<JobState>([
  'failed',
  'timed_out',
  'timing_out',
  'waiting_failed',
  'blocked_failed',
  'unblocked_failed',
]);

const PR_CI_CANCELABLE_JOB_STATES = new Set<JobState>([
  'pending',
  'waiting',
  'limiting',
  'limited',
  'scheduled',
  'assigned',
  'accepted',
  'running',
]);

export type PrCiEarlyStartDecisionReason = 'label_opt_in' | 'percent_rollout' | 'disabled';

export interface PrCiEarlyStartDecision {
  enabled: boolean;
  reason: PrCiEarlyStartDecisionReason;
  rolloutPercent: number;
  rolloutBucket: number;
}

export type PrCiPipelineStep = Record<string, unknown> & {
  key?: string;
  command?: string;
  depends_on?: string | string[];
  env?: Record<string, string | number>;
  steps?: unknown[];
};

export type PrCiPipelineEntry = PrCiPipelineStep | string;

export type PrCiPipeline = Record<string, unknown> & {
  steps: PrCiPipelineEntry[];
};

export function parsePrLabels(labels = process.env.GITHUB_PR_LABELS ?? ''): string[] {
  return labels
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
}

export function parsePrCiEarlyStartRolloutPercent(
  value = process.env[PR_CI_EARLY_START_ROLLOUT_PERCENT_ENV]
): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(100, Math.max(0, parsed));
}

export function getPrCiEarlyStartRolloutSeed(env = process.env): string {
  return (
    env.GITHUB_PR_NUMBER ||
    env.BUILDKITE_PULL_REQUEST ||
    env.BUILDKITE_BRANCH ||
    env.BUILDKITE_COMMIT ||
    'pr-ci-early-start-default-seed'
  );
}

export function getPrCiEarlyStartRolloutBucket(seed: string): number {
  const digest = createHash('sha1')
    .update(seed || 'pr-ci-early-start-default-seed')
    .digest('hex')
    .slice(0, 8);

  return Number.parseInt(digest, 16) % 100;
}

export function hasPrCiEarlyStartOptInLabel(labels: string[]): boolean {
  return labels.some((label) => PR_CI_EARLY_START_OPT_IN_LABELS.has(label));
}

export function getPrCiEarlyStartDecision({
  labels = parsePrLabels(),
  rolloutPercent = parsePrCiEarlyStartRolloutPercent(),
  rolloutSeed = getPrCiEarlyStartRolloutSeed(),
}: {
  labels?: string[];
  rolloutPercent?: number;
  rolloutSeed?: string;
} = {}): PrCiEarlyStartDecision {
  const rolloutBucket = getPrCiEarlyStartRolloutBucket(rolloutSeed);

  if (hasPrCiEarlyStartOptInLabel(labels)) {
    return {
      enabled: true,
      reason: 'label_opt_in',
      rolloutPercent,
      rolloutBucket,
    };
  }

  if (rolloutPercent > 0 && rolloutBucket < rolloutPercent) {
    return {
      enabled: true,
      reason: 'percent_rollout',
      rolloutPercent,
      rolloutBucket,
    };
  }

  return {
    enabled: false,
    reason: 'disabled',
    rolloutPercent,
    rolloutBucket,
  };
}

export function isPrCiGateKey(stepKey?: string | null): boolean {
  return typeof stepKey === 'string' && PR_CI_GATE_KEYS_SET.has(stepKey);
}

export function isPrCiGateFailureState(state: JobState): boolean {
  return PR_CI_GATE_FAILURE_STATES.has(state);
}

export function isPrCiCancelableJobState(state: JobState): boolean {
  return PR_CI_CANCELABLE_JOB_STATES.has(state);
}

export function normalizeDependsOn(dependsOn: string | string[] | undefined): string[] {
  if (!dependsOn) {
    return [];
  }

  return Array.from(new Set(Array.isArray(dependsOn) ? dependsOn : [dependsOn]));
}

export function toDependsOn(dependsOn: string[]): string | string[] | undefined {
  if (dependsOn.length === 0) {
    return undefined;
  }

  return dependsOn.length === 1 ? dependsOn[0] : dependsOn;
}

export function shouldRelaxDependsOnForPrCiEarlyStart(
  dependsOn: string | string[] | undefined
): boolean {
  const normalizedDependsOn = normalizeDependsOn(dependsOn);

  return (
    normalizedDependsOn.some((dependency) => isPrCiGateKey(dependency)) &&
    normalizedDependsOn.some((dependency) => PR_CI_REQUIRED_NON_GATE_DEPENDENCIES.has(dependency))
  );
}

export function relaxDependsOnForPrCiEarlyStart(
  dependsOn: string | string[] | undefined
): string | string[] | undefined {
  const relaxedDependsOn = normalizeDependsOn(dependsOn).filter(
    (dependency) => !isPrCiGateKey(dependency)
  );

  return toDependsOn(relaxedDependsOn);
}

export function isPrCiCancelableCommand(command: string): boolean {
  return command.trimStart().startsWith(`${PR_CI_CANCELABLE_COMMAND_PREFIX} `);
}

export function prefixPrCiCancelableCommand(command: string): string {
  return isPrCiCancelableCommand(command)
    ? command
    : `${PR_CI_CANCELABLE_COMMAND_PREFIX} ${command}`;
}

export function appendPrCiCancelableEnv(
  env: Record<string, string | number> | undefined
): Record<string, string | number> {
  return {
    ...(env ?? {}),
    [PR_CI_CANCELABLE_ON_GATE_FAILURE_ENV]: 'true',
  };
}

export function isPrCiPipelineStep(value: unknown): value is PrCiPipelineStep {
  return typeof value === 'object' && value !== null;
}

export function isPrCiPipeline(value: unknown): value is PrCiPipeline {
  return isPrCiPipelineStep(value) && Array.isArray((value as { steps?: unknown }).steps);
}

export function transformPipelineStepForPrCiEarlyStart(
  step: PrCiPipelineStep,
  inheritedCancelable = false
): PrCiPipelineStep {
  const shouldRelaxDependsOn = shouldRelaxDependsOnForPrCiEarlyStart(step.depends_on);
  const shouldMarkCancelable = inheritedCancelable || shouldRelaxDependsOn;
  const transformedStep: PrCiPipelineStep = { ...step };

  if (typeof step.command === 'string' && shouldMarkCancelable) {
    transformedStep.command = prefixPrCiCancelableCommand(step.command);
    transformedStep.env = appendPrCiCancelableEnv(step.env);
  }

  if (shouldRelaxDependsOn) {
    const relaxedDependsOn = relaxDependsOnForPrCiEarlyStart(step.depends_on);
    if (relaxedDependsOn) {
      transformedStep.depends_on = relaxedDependsOn;
    } else {
      delete transformedStep.depends_on;
    }
  }

  if (Array.isArray(step.steps)) {
    transformedStep.steps = step.steps.map((nestedStep) =>
      isPrCiPipelineStep(nestedStep)
        ? transformPipelineStepForPrCiEarlyStart(nestedStep, shouldMarkCancelable)
        : nestedStep
    );
  }

  return transformedStep;
}

export function transformPipelineForPrCiEarlyStart(pipeline: unknown): PrCiPipeline | null {
  if (!isPrCiPipeline(pipeline)) {
    return null;
  }

  return {
    ...pipeline,
    steps: pipeline.steps.map((step) =>
      isPrCiPipelineStep(step) ? transformPipelineStepForPrCiEarlyStart(step) : step
    ),
  };
}

const isWaitStep = (step: PrCiPipelineEntry): boolean => step === 'wait';

export function removePostGateWaitStepsForPrCiEarlyStart(pipeline: PrCiPipeline): PrCiPipeline {
  let hasSeenGateStep = false;

  const steps = pipeline.steps.filter((step) => {
    if (isPrCiPipelineStep(step) && isPrCiGateKey(step.key)) {
      hasSeenGateStep = true;
    }

    if (isWaitStep(step) && hasSeenGateStep) {
      return false;
    }

    return true;
  });

  return {
    ...pipeline,
    steps,
  };
}
