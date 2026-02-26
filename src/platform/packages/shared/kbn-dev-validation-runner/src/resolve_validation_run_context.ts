/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFailError } from '@kbn/dev-cli-errors';
import {
  countCommitsBetweenRefs,
  hasStagedChanges,
  parseAndResolveValidationContract,
  type ResolvedValidationContract,
} from '@kbn/dev-utils';
import {
  getAffectedMoonProjects,
  resolveMoonAffectedComparison,
  summarizeAffectedMoonProjects,
  type MoonAffectedComparison,
} from '@kbn/moon';

/** Raw CLI flag inputs used to resolve a validation run contract. */
export interface ValidationRunFlagsInput {
  profile?: string;
  scope?: string;
  testMode?: string;
  downstream?: string;
  baseRef?: string;
  headRef?: string;
}

interface ValidationRunContextBase {
  contract: ResolvedValidationContract;
}

type ValidationRunSkipContext = ValidationRunContextBase & {
  kind: 'skip';
  reason: 'no_staged_changes';
};

type ValidationRunFullContext = ValidationRunContextBase & {
  kind: 'full';
  reason?: 'resolve_branch_scope_failed' | 'resolve_staged_scope_failed';
};

type ValidationRunAffectedContext = ValidationRunContextBase & {
  kind: 'affected';
  comparison?: MoonAffectedComparison;
  branchCommitCount?: number;
  affectedSourceRoots: string[];
  isRootProjectAffected: boolean;
};

export type ValidationRunContext =
  | ValidationRunSkipContext
  | ValidationRunFullContext
  | ValidationRunAffectedContext;

/** Inputs for resolving a contract-driven validation run context. */
export interface ResolveValidationRunContextOptions {
  flags: ValidationRunFlagsInput;
  runnerDescription?: string;
  onWarning?: (message: string) => void;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

/** Rejects validation-contract flags when a command is running in direct-target mode. */
export const assertNoValidationRunFlagsForDirectTarget = (flags: ValidationRunFlagsInput) => {
  if (Object.values(flags).some((v) => v !== undefined)) {
    throw createFailError(
      'Cannot combine direct target mode with validation contract flags (--profile, --scope, --test-mode, --downstream, --base-ref, --head-ref).'
    );
  }
};

/** Resolves a concrete validation run context from CLI flags, including Moon/Git-derived scope data. */
export const resolveValidationRunContext = async ({
  flags,
  runnerDescription = 'validation run',
  onWarning,
}: ResolveValidationRunContextOptions): Promise<ValidationRunContext> => {
  const contract = parseAndResolveValidationContract(flags);

  if (contract.scope === 'full') {
    return {
      kind: 'full',
      contract,
    };
  }

  if (contract.scope === 'staged') {
    const stagedChangesDetected = await hasStagedChanges();
    if (!stagedChangesDetected) {
      return {
        kind: 'skip',
        reason: 'no_staged_changes',
        contract,
      };
    }
  }

  // `local` scope intentionally skips comparison resolution: Moon's default behavior
  // diffs the working tree against HEAD, which is exactly what local scope needs.
  let comparison: MoonAffectedComparison | undefined;
  if (contract.scope === 'branch' || contract.scope === 'staged') {
    try {
      comparison = await resolveMoonAffectedComparison({
        scope: contract.scope,
        baseRef: contract.baseRef,
        headRef: contract.headRef,
      });
    } catch (error) {
      const scopeLabel = contract.scope === 'branch' ? 'merge-base' : 'staged snapshot';
      const reason =
        contract.scope === 'branch' ? 'resolve_branch_scope_failed' : 'resolve_staged_scope_failed';

      onWarning?.(
        `Failed to resolve ${scopeLabel} for affected ${runnerDescription} (${getErrorMessage(
          error
        )}). Falling back to full ${runnerDescription}.`
      );
      return {
        kind: 'full',
        reason,
        contract,
      };
    }
  }

  let branchCommitCount: number | undefined;
  if (contract.scope === 'branch' && comparison) {
    try {
      branchCommitCount = await countCommitsBetweenRefs({
        base: comparison.base,
        head: comparison.head,
      });
    } catch {
      // Branch change count is a logging enhancement only.
    }
  }

  const affectedMoonProjects = await getAffectedMoonProjects({
    downstream: contract.downstream,
    ...(comparison ? { base: comparison.base, head: comparison.head } : {}),
  });
  const affectedProjectSummary = summarizeAffectedMoonProjects(affectedMoonProjects);

  return {
    kind: 'affected',
    contract,
    comparison,
    branchCommitCount,
    affectedSourceRoots: affectedProjectSummary.sourceRoots,
    isRootProjectAffected: affectedProjectSummary.isRootProjectAffected,
  };
};
