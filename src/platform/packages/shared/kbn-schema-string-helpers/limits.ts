/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Keep the saved objects related defaults aligned with core's saved_objects_length_limits.ts
export const STRING_HELPER_DEFAULTS = {
  savedObjectId: { minLength: 1, maxLength: 512 },
  savedObjectType: { minLength: 1, maxLength: 256 },
  savedObjectVersion: { minLength: 1, maxLength: 256 },
  spaceId: { minLength: 1, maxLength: 512 },
  displayName: { minLength: 1, maxLength: 1024 },
  description: { minLength: 0, maxLength: 10_000 },
  searchFilter: { minLength: 0, maxLength: 10_000 },
  aggregation: { minLength: 0, maxLength: 100_000 },
  querySortField: { minLength: 0, maxLength: 256 },
  // Conventional URL length ceiling.
  urlString: { minLength: 1, maxLength: 2048 },
  // Fits a full public CA bundle (Mozilla's is ~225 KB) as well as single certificates and keys.
  pemCertificate: { minLength: 1, maxLength: 262_144 },
  // Matches node-semver's MAX_LENGTH.
  version: { minLength: 1, maxLength: 256 },
} as const;

export type StringHelperName = keyof typeof STRING_HELPER_DEFAULTS;

/** Name reported for `boundedString()`, the generic helper for fields no semantic helper fits. */
export const BOUNDED_STRING_HELPER = 'boundedString';

/** Helper names reported in the string length violation metric. */
export type ReportedStringHelperName = StringHelperName | typeof BOUNDED_STRING_HELPER;

/**
 * Upper bound for `boundedString()`'s required `maxLength`. Matches the default
 * `server.maxPayload` (1 MiB) and the top bucket of the violation histogram.
 */
export const BOUNDED_STRING_MAX_LENGTH = 1_048_576;

export interface StringHelperLimits {
  readonly minLength: number;
  readonly maxLength: number;
}

/** Resolves finite string limits, preserving defaults for undefined overrides. */
export const getStringHelperLimits = (
  helper: StringHelperName,
  overrides: Partial<StringHelperLimits> = {}
): StringHelperLimits => {
  const defaults = STRING_HELPER_DEFAULTS[helper];
  const minLength = overrides.minLength ?? defaults.minLength;
  const maxLength = overrides.maxLength ?? defaults.maxLength;
  if (
    !Number.isSafeInteger(minLength) ||
    !Number.isSafeInteger(maxLength) ||
    minLength < 0 ||
    maxLength < minLength
  ) {
    throw new Error(`${helper}() requires non-negative integer limits with minLength <= maxLength`);
  }
  return { minLength, maxLength };
};

/** Validates that minLength, if provided, is a non-negative safe integer. */
export const assertValidMinLength = (minLength: number | undefined): void => {
  if (minLength !== undefined && (!Number.isSafeInteger(minLength) || minLength < 0)) {
    throw new Error('unboundedString() requires a non-negative integer minLength');
  }
};

/** Requires an explanation when opting out of a string length bound. */
export const assertUnboundedStringReason = (reason: string): void => {
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    throw new Error(
      'unboundedString() requires a non-empty reason explaining why no maximum length is set'
    );
  }
};

/**
 * Resolves `boundedString()` limits. `maxLength` is required and capped at
 * BOUNDED_STRING_MAX_LENGTH; `minLength` defaults to 0.
 */
export const getBoundedStringLimits = ({
  minLength = 0,
  maxLength,
}: {
  minLength?: number;
  maxLength: number;
}): StringHelperLimits => {
  if (
    !Number.isSafeInteger(minLength) ||
    !Number.isSafeInteger(maxLength) ||
    minLength < 0 ||
    maxLength < minLength
  ) {
    throw new Error(
      'boundedString() requires non-negative integer limits with minLength <= maxLength'
    );
  }
  if (maxLength > BOUNDED_STRING_MAX_LENGTH) {
    throw new Error(
      `boundedString() requires maxLength <= ${BOUNDED_STRING_MAX_LENGTH}; use unboundedString() with a reason for larger inputs`
    );
  }
  return { minLength, maxLength };
};

/** Requires a static metric label for `boundedString.warn()`. */
export const assertBoundedStringLabel = (label: string): void => {
  if (typeof label !== 'string' || label.trim().length === 0) {
    throw new Error('boundedString.warn() requires a non-empty label');
  }
};
