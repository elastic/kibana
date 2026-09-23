/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowTemplateValues } from '../../types';

export interface CommonWorkerTemplateValues extends ManagedWorkflowTemplateValues {
  settingsVersion: number;
  autonomyLevel: 'manual' | 'assisted' | 'supervised';
}

export const renderCommonWorkerYaml = (
  yaml: string,
  { settingsVersion, autonomyLevel }: CommonWorkerTemplateValues
): string =>
  yaml
    .replaceAll('__WORKER_SETTINGS_VERSION__', String(settingsVersion))
    .replaceAll('__WORKER_AUTONOMY_LEVEL__', autonomyLevel);

/**
 * Values for the subset of Workers that own a scheduled trigger. Kept out of
 * CommonWorkerTemplateValues because alert- and event-driven Workers have no schedule at all.
 */
export interface ScheduledWorkerTemplateValues extends CommonWorkerTemplateValues {
  scheduleInterval: string;
}

export const renderScheduledWorkerYaml = (
  yaml: string,
  values: ScheduledWorkerTemplateValues
): string =>
  renderCommonWorkerYaml(yaml, values).replaceAll(
    '__WORKER_SCHEDULE_INTERVAL__',
    values.scheduleInterval
  );

/** Rule Tuning settings the sweep reads; each is rendered into `consts.worker_settings.extras`. */
const RULE_TUNING_EXTRAS_FIELDS = [
  'analysisWindowDays',
  'fpCountThreshold',
  'fpRateThresholdPct',
] as const;

/**
 * Worker-specific settings are stored under `extras`, mirroring the Worker settings API, so a
 * settings save re-renders YAML and the per-space Worker can pass them to the sweep.
 */
export interface RuleTuningWorkerTemplateValues extends ScheduledWorkerTemplateValues {
  extras: Record<(typeof RULE_TUNING_EXTRAS_FIELDS)[number], number>;
}

/**
 * Refuses to render when an `extras` field the sweep reads is missing.
 *
 * A missing field would otherwise resolve to nothing when the sweep input is read, so the
 * workflow would install cleanly and then misbehave at run time.
 *
 * Only one caller can reach here with a field missing. On startup the platform re-installs every
 * managed workflow by passing whatever is stored straight to this template, skipping the schema
 * check that the settings read and save paths run first. A document written before these settings
 * existed arrives intact; throwing leaves it that way instead of overwriting it with a broken
 * render.
 */
const assertCompleteExtras = (extras: RuleTuningWorkerTemplateValues['extras']): void => {
  for (const field of RULE_TUNING_EXTRAS_FIELDS) {
    const value = extras?.[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(
        `Rule Tuning worker settings are missing "extras.${field}". The stored document predates ` +
          `this setting and has to be reset.`
      );
    }
  }
};

export const renderRuleTuningWorkerYaml = (
  yaml: string,
  values: RuleTuningWorkerTemplateValues
): string => {
  assertCompleteExtras(values.extras);
  // JSON is a YAML flow mapping, so the whole object lands under consts in one substitution.
  return renderScheduledWorkerYaml(yaml, values).replaceAll(
    '__WORKER_EXTRAS__',
    JSON.stringify(values.extras)
  );
};
