/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseAndResolveValidationContract, type ResolvedValidationContract } from '@kbn/dev-utils';

import {
  assertNoValidationRunFlagsForDirectTarget,
  resolveValidationRunContext,
  type ValidationRunContext,
  type ValidationRunFlagsInput,
} from './resolve_validation_run_context';

type MaybePromise<T> = Promise<T> | T;

/** Context for direct-target execution where contract-driven Moon/Git resolution is skipped. */
export interface ValidationDirectTargetContext {
  mode: 'direct_target';
  directTarget: string;
  contract: ResolvedValidationContract;
}

/** Context for contract-driven execution where Moon/Git-derived run scope has been resolved. */
export interface ValidationContractContext {
  mode: 'contract';
  contract: ResolvedValidationContract;
  runContext: ValidationRunContext;
}

export type ValidationBaseContext = ValidationDirectTargetContext | ValidationContractContext;

/** Options for resolving a reusable validation base context from CLI-facing flags. */
export interface ResolveValidationBaseContextOptions {
  flags: ValidationRunFlagsInput;
  directTarget?: string;
  runnerDescription?: string;
  onWarning?: (message: string) => void;
}

export type ValidationRunCommandOutcome<TResult> =
  | {
      status: 'success';
      result: TResult;
    }
  | {
      status: 'failed';
      error: unknown;
    };

/** Options for executing one validation command with optional lifecycle hooks. */
export interface RunValidationCommandOptions<TResult> {
  baseContext: ValidationBaseContext;
  beforeExecute?: (baseContext: ValidationBaseContext) => MaybePromise<void>;
  execute: (baseContext: ValidationBaseContext) => MaybePromise<TResult>;
  afterExecute?: (
    baseContext: ValidationBaseContext,
    outcome: ValidationRunCommandOutcome<TResult>
  ) => MaybePromise<void>;
}

/** Defines one named tool run inside a shared validation suite. */
export interface ValidationSuiteTool<TResult> {
  name: string;
  execute: (baseContext: ValidationBaseContext) => MaybePromise<TResult>;
}

/** Options for executing multiple validation tools from a single resolved base context. */
export interface RunValidationSuiteOptions<TResult> {
  baseContext: ValidationBaseContext;
  tools: Array<ValidationSuiteTool<TResult>>;
  stopOnError?: boolean;
}

/** Result for an individual tool execution within a validation suite. */
export interface ValidationSuiteToolResult<TResult> {
  toolName: string;
  outcome: ValidationRunCommandOutcome<TResult>;
}

/** Result for a full validation suite execution, including shared context and tool outcomes. */
export interface ValidationSuiteResult<TResult> {
  baseContext: ValidationBaseContext;
  results: Array<ValidationSuiteToolResult<TResult>>;
  hasFailures: boolean;
}

const formatShortRevision = (revision: string) => revision.slice(0, 12);
const pluralize = (count: number, singular: string) =>
  `${count} ${singular}${count === 1 ? '' : 's'}`;

/**
 * Describes what revisions/change-scope a resolved validation context represents.
 * Consumers can log this once and keep command-level logs focused on tool-specific execution.
 */
export const describeValidationScope = (baseContext: ValidationBaseContext): string => {
  if (baseContext.mode === 'direct_target') {
    return `direct target=${baseContext.directTarget}`;
  }

  const { contract, runContext } = baseContext;
  const parts = [
    `profile=${contract.profile}`,
    `scope=${contract.scope}`,
    `test-mode=${contract.testMode}`,
    `downstream=${contract.downstream}`,
  ];

  if (runContext.kind === 'affected' && runContext.comparison) {
    parts.push(
      `base=${runContext.comparison.baseRef} (${formatShortRevision(runContext.comparison.base)})`,
      `head=${runContext.comparison.headRef}`
    );

    if (contract.scope === 'branch') {
      parts.push(`commits=${runContext.branchCommitCount ?? 'unknown'}`);
    }
  } else if (runContext.kind === 'full' && runContext.reason) {
    parts.push(`reason=${runContext.reason}`);
  }

  return parts.join(', ');
};

/** Describes where no affected targets were searched for the current validation contract. */
export const describeValidationNoTargetsScope = (baseContext: ValidationBaseContext): string => {
  if (baseContext.mode === 'direct_target') {
    return 'for the direct target';
  }

  const { contract, runContext } = baseContext;
  if (contract.scope === 'branch' && runContext.kind === 'affected' && runContext.comparison) {
    return `between ${runContext.comparison.baseRef} (${formatShortRevision(
      runContext.comparison.base
    )}) and ${runContext.comparison.headRef}`;
  }

  if (contract.scope === 'staged') {
    return 'in staged changes';
  }

  if (contract.scope === 'local') {
    return 'in local changes';
  }

  return 'for the selected validation scope';
};

/** Inputs for formatting a scoped-target summary from a resolved validation context. */
export interface DescribeValidationScopingOptions {
  baseContext: ValidationBaseContext;
  targetCount: number;
  targetNoun?: string;
}

/** Formats a human-readable "Checking ..." message for tool-specific target sets. */
export const describeValidationScoping = ({
  baseContext,
  targetCount,
  targetNoun = 'project',
}: DescribeValidationScopingOptions): string => {
  const targetSummary = pluralize(targetCount, targetNoun);
  const contract = baseContext.contract;
  const contractSummary = `scope=${contract.scope}, test-mode=${contract.testMode}, downstream=${contract.downstream}`;

  if (baseContext.mode === 'direct_target') {
    return `Checking ${targetSummary} from direct target ${baseContext.directTarget} (${contractSummary}).`;
  }

  const { runContext } = baseContext;

  if (runContext.kind === 'affected' && runContext.comparison && contract.scope === 'branch') {
    const changeSummary =
      runContext.branchCommitCount === undefined
        ? 'commits'
        : pluralize(runContext.branchCommitCount, 'commit');
    return `Checking ${targetSummary} affected by ${changeSummary} between ${
      runContext.comparison.baseRef
    } (${formatShortRevision(runContext.comparison.base)}) and ${
      runContext.comparison.headRef
    } (${contractSummary}).`;
  }

  if (runContext.kind === 'affected' && contract.scope === 'staged') {
    return `Checking ${targetSummary} affected by staged changes (${contractSummary}).`;
  }

  if (runContext.kind === 'affected' && contract.scope === 'local') {
    return `Checking ${targetSummary} affected by local changes (${contractSummary}).`;
  }

  return `Checking ${targetSummary} (${contractSummary}).`;
};

const mergeErrors = (primaryError: unknown, secondaryError: unknown) => {
  return new AggregateError(
    [primaryError, secondaryError],
    'Validation command failed and afterExecute hook also failed.'
  );
};

/** Resolves reusable validation context once for either direct-target or contract-driven execution. */
export const resolveValidationBaseContext = async ({
  flags,
  directTarget,
  runnerDescription,
  onWarning,
}: ResolveValidationBaseContextOptions): Promise<ValidationBaseContext> => {
  if (directTarget) {
    assertNoValidationRunFlagsForDirectTarget(flags);
    const contract = parseAndResolveValidationContract(flags);
    return { mode: 'direct_target', directTarget, contract };
  }

  const runContext = await resolveValidationRunContext({
    flags,
    runnerDescription,
    onWarning,
  });

  return { mode: 'contract', contract: runContext.contract, runContext };
};

/** Executes one validation command against a resolved base context and preserves primary execution errors. */
export const runValidationCommand = async <TResult>({
  baseContext,
  beforeExecute,
  execute,
  afterExecute,
}: RunValidationCommandOptions<TResult>): Promise<TResult> => {
  let outcome: ValidationRunCommandOutcome<TResult>;
  try {
    await beforeExecute?.(baseContext);
    outcome = {
      status: 'success',
      result: await execute(baseContext),
    };
  } catch (error) {
    outcome = {
      status: 'failed',
      error,
    };
  }

  let afterExecuteError: unknown;
  try {
    await afterExecute?.(baseContext, outcome);
  } catch (error) {
    afterExecuteError = error;
  }

  if (outcome.status === 'failed') {
    if (afterExecuteError !== undefined) {
      throw mergeErrors(outcome.error, afterExecuteError);
    }
    throw outcome.error;
  }

  if (afterExecuteError !== undefined) {
    throw afterExecuteError;
  }

  return outcome.result;
};

/** Runs multiple validation tools using one shared base context to avoid duplicated Moon/Git resolution. */
export const runValidationSuite = async <TResult>({
  baseContext,
  tools,
  stopOnError = false,
}: RunValidationSuiteOptions<TResult>): Promise<ValidationSuiteResult<TResult>> => {
  const results: Array<ValidationSuiteToolResult<TResult>> = [];
  for (const tool of tools) {
    try {
      const result = await tool.execute(baseContext);
      results.push({
        toolName: tool.name,
        outcome: {
          status: 'success',
          result,
        },
      });
    } catch (error) {
      results.push({
        toolName: tool.name,
        outcome: {
          status: 'failed',
          error,
        },
      });

      if (stopOnError) {
        break;
      }
    }
  }

  return {
    baseContext,
    results,
    hasFailures: results.some((result) => result.outcome.status === 'failed'),
  };
};
