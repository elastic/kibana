/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResolvedValidationContract } from '@kbn/dev-utils';
import type { MoonAffectedBase } from '@kbn/moon';
import type { ValidationRunFlagsInput } from './resolve_validation_run_context';

/** Shared validation flag names used by validation-style CLIs. */
export const VALIDATION_RUN_STRING_FLAGS = [
  'profile',
  'scope',
  'test-mode',
  'base-ref',
  'head-ref',
  'downstream',
] as const;

const VALIDATION_RUN_FLAGS = new Set(VALIDATION_RUN_STRING_FLAGS.map((flag) => `--${flag}`));

/** Shared validation help text block for CLI usage messages. */
export const VALIDATION_RUN_HELP = `
        --profile [name]        Validation profile: precommit, quick, agent, branch, pr, full (default: branch)
        --scope [scope]         Scope: staged, local, branch, full
        --test-mode [mode]      Test selection mode: related, affected, all
        --base-ref [git-ref]    Base revision for branch scope
        --head-ref [git-ref]    Head revision for branch scope (default: HEAD)
        --downstream [mode]     Downstream mode for related/affected: none, direct, deep
`;

/** Minimal flags reader contract needed to parse shared validation flags. */
export interface ValidationRunFlagsReader {
  string: (name: string) => string | undefined;
}

/** Inputs for building consistent log/reproduction args from a resolved validation contract. */
export interface BuildValidationCliArgsOptions {
  contract?: ResolvedValidationContract;
  resolvedBase?: MoonAffectedBase;
  directTarget?: {
    flag: string;
    value: string;
  };
  forceFullProfile?: boolean;
}

/** Generated args for command logs and CI/local reproduction output. */
export interface ValidationCliArgs {
  logArgs: string[];
  reproductionArgs: string[];
}

/** Returns true when any shared validation-contract flag is present in raw CLI args. */
export const hasValidationRunFlags = (args: string[]) =>
  args.some((arg) => VALIDATION_RUN_FLAGS.has(arg.split('=')[0]));

/** Formats a reproduction command from a script name and CLI args. */
export const formatReproductionCommand = (scriptName: string, args: string[]) => {
  const argsSuffix = args.length > 0 ? ` ${args.join(' ')}` : '';
  return `node scripts/${scriptName}${argsSuffix}`;
};

/** Reads shared validation flags from a command flags reader. */
export const readValidationRunFlags = (
  flagsReader: ValidationRunFlagsReader
): ValidationRunFlagsInput => ({
  profile: flagsReader.string('profile'),
  scope: flagsReader.string('scope'),
  testMode: flagsReader.string('test-mode'),
  downstream: flagsReader.string('downstream'),
  baseRef: flagsReader.string('base-ref'),
  headRef: flagsReader.string('head-ref'),
});

/** Builds shared validation CLI args for command logs and reproduction commands. */
export const buildValidationCliArgs = ({
  contract,
  resolvedBase,
  directTarget,
  forceFullProfile = false,
}: BuildValidationCliArgsOptions): ValidationCliArgs => {
  if (directTarget) {
    const args = [directTarget.flag, directTarget.value];
    return {
      logArgs: args,
      reproductionArgs: args,
    };
  }

  if (forceFullProfile) {
    const args = ['--profile', 'full'];
    return {
      logArgs: args,
      reproductionArgs: args,
    };
  }

  if (!contract) {
    throw new Error(
      'contract is required when neither directTarget nor forceFullProfile is provided.'
    );
  }

  const logArgs: string[] = [
    '--profile',
    contract.profile,
    '--scope',
    contract.scope,
    '--test-mode',
    contract.testMode,
    '--downstream',
    contract.downstream,
  ];
  const reproductionArgs: string[] = ['--scope', contract.scope, '--test-mode', contract.testMode];
  if (contract.downstream !== 'none') {
    reproductionArgs.push('--downstream', contract.downstream);
  }

  if (contract.scope === 'branch' && resolvedBase) {
    if (resolvedBase.baseRef === 'GITHUB_PR_MERGE_BASE') {
      logArgs.push('--base-ref', '$GITHUB_PR_MERGE_BASE');
    } else {
      logArgs.push('--base-ref', resolvedBase.base);
    }

    // Reproduction always uses the resolved SHA so copy/paste works in any shell.
    reproductionArgs.push('--base-ref', resolvedBase.base);
  }

  return {
    logArgs,
    reproductionArgs,
  };
};
