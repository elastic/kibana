/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DurationInputUnit, DurationOutputUnit } from '../../schema/duration_units';
import {
  LENS_DURATION_API_INPUT_UNIT_DEFAULT,
  LENS_DURATION_API_OUTPUT_UNIT_DEFAULT,
} from '../../schema/constants';
import { getReversibleMappings } from '../charts/utils';

const inputCompat = getReversibleMappings<DurationInputUnit, string>([
  ['ps', 'picoseconds'],
  ['ns', 'nanoseconds'],
  ['us', 'microseconds'],
  ['ms', 'milliseconds'],
  ['s', 'seconds'],
  ['min', 'minutes'],
  ['h', 'hours'],
  ['d', 'days'],
  ['w', 'weeks'],
  ['mo', 'months'],
  ['y', 'years'],
]);

const outputCompat = getReversibleMappings<DurationOutputUnit, string>([
  ['auto-approximate', 'humanize'],
  ['auto', 'humanizePrecise'],
  ['ms', 'asMilliseconds'],
  ['s', 'asSeconds'],
  ['min', 'asMinutes'],
  ['h', 'asHours'],
  ['d', 'asDays'],
  ['w', 'asWeeks'],
  ['mo', 'asMonths'],
  ['y', 'asYears'],
]);

/**
 * Legacy (pre-GA) API unit names mapped to their Lens state representation. Used only in the
 * API→state direction so that requests made while `asCode.useGASchemas` is disabled still
 * transform correctly. The state→API direction here always emits GA names; the Lens as-code route
 * boundary down-converts the response to legacy field-format names when the feature flag is
 * disabled (see `toLegacyDurationUnits`), so the builder itself stays canonical for all other
 * consumers.
 */
const inputLegacyAliasToState: Record<string, string> = {
  m: 'minutes',
};

const outputLegacyAliasToState: Record<string, string> = {
  humanize: 'humanize',
  humanizePrecise: 'humanizePrecise',
  m: 'asMinutes',
};

export const durationInputUnitCompat = {
  /**
   * Converts an API input unit to the Lens state representation.
   * Accepts both GA short-form enums (e.g. `'min'`) and legacy names (e.g. `'m'`).
   */
  toState: (unit: string): string =>
    inputCompat.toState(unit as DurationInputUnit) ?? inputLegacyAliasToState[unit] ?? unit,
  toAPI: (unit?: string) => inputCompat.toAPI(unit) ?? LENS_DURATION_API_INPUT_UNIT_DEFAULT,
};

export const durationOutputUnitCompat = {
  /**
   * Converts an API output unit to the Lens state representation.
   * Accepts both GA short-form enums (e.g. `'auto'`, `'auto-approximate'`, `'min'`)
   * and legacy names (e.g. `'humanize'`, `'humanizePrecise'`, `'m'`).
   */
  toState: (unit: string): string =>
    outputCompat.toState(unit as DurationOutputUnit) ?? outputLegacyAliasToState[unit] ?? unit,
  toAPI: (unit?: string) => outputCompat.toAPI(unit) ?? LENS_DURATION_API_OUTPUT_UNIT_DEFAULT,
};

/** Converts a GA `from` unit to the legacy API field-format name (e.g. `s` → `seconds`). */
export const gaDurationInputUnitToLegacyApi = (unit: string): string =>
  durationInputUnitCompat.toState(unit);

/** Converts a GA `to` unit to the legacy API field-format name (e.g. `s` → `asSeconds`). */
export const gaDurationOutputUnitToLegacyApi = (unit: string): string =>
  durationOutputUnitCompat.toState(unit);
