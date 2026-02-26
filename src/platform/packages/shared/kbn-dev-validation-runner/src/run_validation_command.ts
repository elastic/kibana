/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  assertNoValidationRunFlagsForDirectTarget,
  resolveValidationRunContext,
  type ValidationRunContext,
  type ValidationRunFlagsInput,
} from './resolve_validation_run_context';

/** Context for direct-target execution where contract-driven Moon/Git resolution is skipped. */
export interface ValidationDirectTargetContext {
  mode: 'direct_target';
  directTarget: string;
}

/** Context for contract-driven execution where change-file scope has been resolved. */
export interface ValidationContractContext {
  mode: 'contract';
  contract: ValidationRunContext['contract'];
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

  if (runContext.kind === 'affected' && runContext.resolvedBase) {
    parts.push(
      `base=${runContext.resolvedBase.baseRef} (${formatShortRevision(
        runContext.resolvedBase.base
      )})`,
      `head=HEAD`
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
  if (contract.scope === 'branch' && runContext.kind === 'affected' && runContext.resolvedBase) {
    return `between ${runContext.resolvedBase.baseRef} (${formatShortRevision(
      runContext.resolvedBase.base
    )}) and HEAD`;
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

  if (baseContext.mode === 'direct_target') {
    return `Checking ${targetSummary} from direct target ${baseContext.directTarget}.`;
  }

  const { contract, runContext } = baseContext;
  const contractSummary = `scope=${contract.scope}, test-mode=${contract.testMode}, downstream=${contract.downstream}`;

  if (runContext.kind === 'affected' && runContext.resolvedBase && contract.scope === 'branch') {
    const changeSummary =
      runContext.branchCommitCount === undefined
        ? 'commits'
        : pluralize(runContext.branchCommitCount, 'commit');
    return `Checking ${targetSummary} affected by ${changeSummary} between ${
      runContext.resolvedBase.baseRef
    } (${formatShortRevision(runContext.resolvedBase.base)}) and HEAD (${contractSummary}).`;
  }

  if (runContext.kind === 'affected' && contract.scope === 'staged') {
    return `Checking ${targetSummary} affected by staged changes (${contractSummary}).`;
  }

  if (runContext.kind === 'affected' && contract.scope === 'local') {
    return `Checking ${targetSummary} affected by local changes (${contractSummary}).`;
  }

  return `Checking ${targetSummary} (${contractSummary}).`;
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
    return { mode: 'direct_target', directTarget };
  }

  const runContext = await resolveValidationRunContext({
    flags,
    runnerDescription,
    onWarning,
  });

  return { mode: 'contract', contract: runContext.contract, runContext };
};
