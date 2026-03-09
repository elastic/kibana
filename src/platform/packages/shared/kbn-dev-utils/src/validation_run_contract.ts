/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFailError } from '@kbn/dev-cli-errors';

export type ValidationScope = 'staged' | 'local' | 'branch' | 'full';
export type ValidationTestMode = 'related' | 'affected' | 'all';
export type ValidationDownstreamMode = 'none' | 'direct' | 'deep';
export type ValidationProfile = 'precommit' | 'quick' | 'agent' | 'branch' | 'pr' | 'full';

export interface ValidationProfileDefaults {
  scope: ValidationScope;
  testMode: ValidationTestMode;
  downstream: ValidationDownstreamMode;
}

export const VALIDATION_PROFILE_DEFAULTS: Readonly<
  Record<ValidationProfile, Readonly<ValidationProfileDefaults>>
> = {
  precommit: {
    scope: 'staged',
    testMode: 'related',
    downstream: 'none',
  },
  quick: {
    scope: 'local',
    testMode: 'related',
    downstream: 'none',
  },
  agent: {
    scope: 'local',
    testMode: 'related',
    downstream: 'none',
  },
  branch: {
    scope: 'branch',
    testMode: 'affected',
    downstream: 'none',
  },
  pr: {
    scope: 'branch',
    testMode: 'affected',
    downstream: 'deep',
  },
  full: {
    scope: 'full',
    testMode: 'all',
    downstream: 'none',
  },
};

export interface ResolvedValidationContract {
  profile: ValidationProfile;
  scope: ValidationScope;
  testMode: ValidationTestMode;
  downstream: ValidationDownstreamMode;
  baseRef?: string;
  headRef?: string;
}

const normalizeValue = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const createEnumParser =
  <T extends string>(flagName: string, validValues: readonly T[]) =>
  (value: string | undefined): T | undefined => {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if ((validValues as readonly string[]).includes(normalized)) {
      return normalized as T;
    }

    throw createFailError(
      `Unsupported --${flagName} value '${value}'. Expected one of: ${validValues.join(', ')}.`
    );
  };

const parseValidationScope = createEnumParser<ValidationScope>('scope', [
  'staged',
  'local',
  'branch',
  'full',
]);

const parseValidationTestMode = createEnumParser<ValidationTestMode>('test-mode', [
  'related',
  'affected',
  'all',
]);

const parseValidationDownstreamMode = createEnumParser<ValidationDownstreamMode>('downstream', [
  'none',
  'direct',
  'deep',
]);

const parseValidationProfile = createEnumParser<ValidationProfile>('profile', [
  'precommit',
  'quick',
  'agent',
  'branch',
  'pr',
  'full',
]);

/** Applies profile defaults and explicit overrides to build a concrete validation contract. */
const resolveValidationContract = ({
  profile,
  scope,
  testMode,
  downstream,
  baseRef,
  headRef,
}: {
  profile?: ValidationProfile;
  scope?: ValidationScope;
  testMode?: ValidationTestMode;
  downstream?: ValidationDownstreamMode;
  baseRef?: string;
  headRef?: string;
}): ResolvedValidationContract => {
  const resolvedProfile: ValidationProfile = profile ?? 'branch';
  const defaults = VALIDATION_PROFILE_DEFAULTS[resolvedProfile];
  const resolvedScope = scope ?? defaults.scope;

  return {
    profile: resolvedProfile,
    scope: resolvedScope,
    testMode: testMode ?? defaults.testMode,
    downstream: downstream ?? defaults.downstream,
    baseRef,
    headRef: resolvedScope === 'branch' ? headRef ?? 'HEAD' : headRef,
  };
};

/** Validates cross-flag invariants for a resolved validation contract. */
const validateResolvedValidationContract = ({
  scope,
  baseRef,
  headRef,
}: Pick<ResolvedValidationContract, 'scope' | 'baseRef' | 'headRef'>): void => {
  if (scope !== 'branch' && baseRef !== undefined) {
    throw createFailError('--base-ref can only be used when --scope is branch.');
  }
  if (scope !== 'branch' && headRef !== undefined) {
    throw createFailError('--head-ref can only be used when --scope is branch.');
  }
};

/** Parses, resolves, and validates validation-contract flags in one call. */
export const parseAndResolveValidationContract = ({
  profile,
  scope,
  testMode,
  downstream,
  baseRef,
  headRef,
}: {
  profile?: string;
  scope?: string;
  testMode?: string;
  downstream?: string;
  baseRef?: string;
  headRef?: string;
}): ResolvedValidationContract => {
  const resolvedContract = resolveValidationContract({
    profile: parseValidationProfile(profile),
    scope: parseValidationScope(scope),
    testMode: parseValidationTestMode(testMode),
    downstream: parseValidationDownstreamMode(downstream),
    baseRef: normalizeValue(baseRef),
    headRef: normalizeValue(headRef),
  });

  validateResolvedValidationContract(resolvedContract);

  return resolvedContract;
};
