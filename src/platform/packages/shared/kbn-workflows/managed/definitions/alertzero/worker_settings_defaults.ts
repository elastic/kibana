/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Each AlertZero Worker's allowed autonomy levels and setting defaults, and the upgrade that brings a
 * stored settings document up to them. The Worker renderers and the AlertZero settings read path
 * both run stored values through `upgradeStoredWorkerSettings`, so the settings page and the running
 * workflow agree without the stored document being rewritten. Kept free of imports so
 * `@kbn/alertzero-common` can depend on it from the browser.
 */

/**
 * The autonomy dial, in ascending order. One shared scale: a level means the same thing on every
 * Worker, and only the allowed subset varies.
 */
export const WORKER_AUTONOMY_LEVELS = ['manual', 'assisted', 'supervised'] as const;

export type WorkerAutonomyLevel = (typeof WORKER_AUTONOMY_LEVELS)[number];

/** Every action passes a human review gate, so the Worker offers no unattended level. */
export const REVIEW_GATED_AUTONOMY_LEVELS = ['manual', 'assisted'] as const;

export interface WorkerSettingsDefaults {
  /** Ascending. Manual is the fresh-install level when allowed, otherwise the first. */
  allowedAutonomyLevels: readonly [WorkerAutonomyLevel, ...WorkerAutonomyLevel[]];
  scheduleInterval?: { defaultValue: string };
  extras?: { defaultValue: Readonly<Record<string, unknown>> };
}

export const ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS = {
  // Two levels rather than the shared three: this Worker has exactly one gate, the false-positive
  // closure proposal, so it needs one level that gates it and one that does not.
  // `floor_alert_triage.yaml` decides `autoApprove` on `autonomy == 'supervised'` alone, which
  // leaves `assisted` meaning the same as `manual`.
  allowedAutonomyLevels: ['manual', 'supervised'],
  extras: { defaultValue: { autoCloseConfidenceScoreMinThreshold: 0.85 } },
} as const satisfies WorkerSettingsDefaults;

export const ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS = {
  // Two levels rather than the shared three: this Worker has exactly one gate, the forensics
  // handoff a true-positive or inconclusive verdict proposes. `assisted` would mean the same as
  // `manual` here.
  allowedAutonomyLevels: ['manual', 'supervised'],
  // Matches the Attack Discovery schedule form default.
  scheduleInterval: { defaultValue: '24h' },
} as const satisfies WorkerSettingsDefaults;

export const CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS = {
  // Manual only: Hunt Watch locks autonomy at the settings-page level too (see
  // `CONTINUOUS_THREAT_HUNT_SETTINGS` in @kbn/alertzero-common). A stored assisted/supervised
  // value from before the lock is read and rendered as manual.
  allowedAutonomyLevels: ['manual'],
  scheduleInterval: { defaultValue: '4h' },
} as const satisfies WorkerSettingsDefaults;

export const ENDPOINT_ANALYSIS_WORKER_SETTINGS_DEFAULTS = {
  allowedAutonomyLevels: ['manual', 'supervised'],
} as const satisfies WorkerSettingsDefaults;

export const RULE_TUNING_WORKER_SETTINGS_DEFAULTS = {
  allowedAutonomyLevels: REVIEW_GATED_AUTONOMY_LEVELS,
  scheduleInterval: { defaultValue: '2h' },
  extras: { defaultValue: { analysisWindowDays: 7, fpCountThreshold: 10, fpRateThresholdPct: 50 } },
} as const satisfies WorkerSettingsDefaults;

export const RULE_COVERAGE_WORKER_SETTINGS_DEFAULTS = {
  allowedAutonomyLevels: REVIEW_GATED_AUTONOMY_LEVELS,
  scheduleInterval: { defaultValue: '1h' },
  extras: { defaultValue: { lookbackDays: 14, maxGapsPerRun: 5 } },
} as const satisfies WorkerSettingsDefaults;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isWorkerAutonomyLevel = (value: unknown): value is WorkerAutonomyLevel =>
  typeof value === 'string' && (WORKER_AUTONOMY_LEVELS as readonly string[]).includes(value);

const autonomyRank = (level: WorkerAutonomyLevel): number => WORKER_AUTONOMY_LEVELS.indexOf(level);

/** The most autonomous level in `allowed` strictly below `level`, or undefined. */
export const nearestLowerAutonomyLevel = (
  allowed: readonly WorkerAutonomyLevel[],
  level: WorkerAutonomyLevel
): WorkerAutonomyLevel | undefined =>
  allowed
    .filter((candidate) => autonomyRank(candidate) < autonomyRank(level))
    .reduce<WorkerAutonomyLevel | undefined>(
      (highest, candidate) =>
        highest === undefined || autonomyRank(candidate) > autonomyRank(highest)
          ? candidate
          : highest,
      undefined
    );

const fillMissingSchedule = (
  defaults: WorkerSettingsDefaults,
  stored: Record<string, unknown>
): Record<string, unknown> => {
  if (!defaults.scheduleInterval || Object.hasOwn(stored, 'scheduleInterval')) {
    return stored;
  }
  return { ...stored, scheduleInterval: defaults.scheduleInterval.defaultValue };
};

const fillMissingExtras = (
  defaults: WorkerSettingsDefaults,
  stored: Record<string, unknown>
): Record<string, unknown> => {
  const extrasDefaults = defaults.extras?.defaultValue;
  if (extrasDefaults === undefined) {
    if (!Object.hasOwn(stored, 'extras')) {
      return stored;
    }
    // Drop stale extras so the narrower complete schema does not reject them.
    const { extras: _extras, ...rest } = stored;
    return rest;
  }
  const { extras } = stored;
  if (extras === undefined) {
    return { ...stored, extras: { ...extrasDefaults } };
  }
  if (!isRecord(extras)) {
    return stored;
  }
  const missing = Object.keys(extrasDefaults).filter((key) => !Object.hasOwn(extras, key));
  if (missing.length === 0) {
    return stored;
  }
  return { ...stored, extras: { ...extrasDefaults, ...extras } };
};

const lowerDisallowedAutonomy = (
  defaults: WorkerSettingsDefaults,
  stored: Record<string, unknown>
): Record<string, unknown> => {
  const { autonomyLevel } = stored;
  if (
    !isWorkerAutonomyLevel(autonomyLevel) ||
    defaults.allowedAutonomyLevels.includes(autonomyLevel)
  ) {
    return stored;
  }
  const lowered = nearestLowerAutonomyLevel(defaults.allowedAutonomyLevels, autonomyLevel);
  // With nothing allowed below it, the stored level is kept for validation to reject.
  return lowered === undefined ? stored : { ...stored, autonomyLevel: lowered };
};

/**
 * Brings a stored settings document up to the Worker's current defaults without replacing what it
 * chose. Never modifies `stored`; returns it unchanged when nothing applies.
 */
export const upgradeStoredWorkerSettings = <TStored extends Record<string, unknown>>(
  defaults: WorkerSettingsDefaults,
  stored: TStored
): TStored =>
  lowerDisallowedAutonomy(
    defaults,
    fillMissingExtras(defaults, fillMissingSchedule(defaults, stored))
  ) as TStored;
