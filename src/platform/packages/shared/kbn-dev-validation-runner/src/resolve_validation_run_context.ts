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
  isShallowRepository,
  parseAndResolveValidationContract,
  type ResolvedValidationContract,
} from '@kbn/dev-utils';
import {
  getAffectedMoonProjectsFromChangedFiles,
  getMoonChangedFiles,
  resolveMoonAffectedBase,
  summarizeAffectedMoonProjects,
  type MoonAffectedBase,
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
  reason?: 'resolve_branch_scope_failed';
};

type ValidationRunAffectedContext = ValidationRunContextBase & {
  kind: 'affected';
  resolvedBase?: MoonAffectedBase;
  branchCommitCount?: number;
  changedFiles: string[];
};

export type ValidationRunContext =
  | ValidationRunSkipContext
  | ValidationRunFullContext
  | ValidationRunAffectedContext;

export interface ValidationAffectedProjectsContext {
  affectedSourceRoots: string[];
  isRootProjectAffected: boolean;
}

/** Inputs for resolving a contract-driven validation run context. */
export interface ResolveValidationRunContextOptions {
  flags: ValidationRunFlagsInput;
  runnerDescription?: string;
  onWarning?: (message: string) => void;
}

export interface ResolveValidationAffectedProjectsOptions {
  changedFilesJson: string;
  downstream?: 'none' | 'direct' | 'deep';
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

/** Resolves a concrete validation run context from CLI flags, including changed-file scope data. */
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

  // Resolve base for branch scope (for logging, reproduction, and Moon queries).
  let resolvedBase: MoonAffectedBase | undefined;
  if (contract.scope === 'branch') {
    try {
      const normalizedBaseRef = contract.baseRef?.trim() || undefined;
      if (normalizedBaseRef) {
        resolvedBase = { base: normalizedBaseRef, baseRef: normalizedBaseRef };
      } else {
        resolvedBase = await resolveMoonAffectedBase({
          headRef: contract.headRef?.trim() || 'HEAD',
        });
      }
    } catch (error) {
      onWarning?.(
        `Failed to resolve merge-base for affected ${runnerDescription} (${getErrorMessage(
          error
        )}). Falling back to full ${runnerDescription}.`
      );
      return {
        kind: 'full',
        reason: 'resolve_branch_scope_failed',
        contract,
      };
    }
  }

  let branchCommitCount: number | undefined;
  if (contract.scope === 'branch' && resolvedBase) {
    try {
      branchCommitCount = await countCommitsBetweenRefs({
        base: resolvedBase.base,
        head: contract.headRef?.trim() || 'HEAD',
      });
    } catch {
      // Branch change count is a logging enhancement only.
    }
  }

  const changedFiles = await getMoonChangedFiles({
    scope: contract.scope as Exclude<typeof contract.scope, 'full'>,
    base: resolvedBase?.base,
    head: contract.headRef?.trim() || undefined,
  });

  if (changedFiles.length === 0 && (await isShallowRepository())) {
    onWarning?.(
      `Moon reported no changed files for scope=${contract.scope}, but this repository is shallow. A full Git history is required for affected validation; run \`git fetch --unshallow\`.`
    );
  }

  return {
    kind: 'affected',
    contract,
    resolvedBase,
    branchCommitCount,
    changedFiles,
  };
};

/**
 * Resolves Moon-affected project roots from pre-resolved changed files.
 *
 * Accepts `changedFilesJson` (Moon JSON format) to pipe directly into
 * `moon query projects --affected`, avoiding duplicate Moon queries.
 */
export const resolveValidationAffectedProjects = async ({
  changedFilesJson,
  downstream = 'none',
}: ResolveValidationAffectedProjectsOptions): Promise<ValidationAffectedProjectsContext> => {
  const affectedMoonProjects = await getAffectedMoonProjectsFromChangedFiles({
    changedFilesJson,
    downstream,
  });
  const affectedProjectSummary = summarizeAffectedMoonProjects(affectedMoonProjects);

  return {
    affectedSourceRoots: affectedProjectSummary.sourceRoots,
    isRootProjectAffected: affectedProjectSummary.isRootProjectAffected,
  };
};
