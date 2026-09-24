/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ATTACK_DISCOVERY_SCHEDULE_INTERVAL_DEFAULT,
  RULE_TUNING_EXTRAS_DEFAULTS,
  RULE_TUNING_SCHEDULE_INTERVAL_DEFAULT,
} from './worker_settings_defaults';
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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * A stored document can omit a field added after it was written. The platform's boot
 * re-render calls `yamlTemplate` with those stored values and no plugin code in the path,
 * so an absent interval has to be filled here. A present value, including a wrong type,
 * is left alone.
 */
const withScheduleDefault = (
  values: ScheduledWorkerTemplateValues,
  scheduleIntervalDefault: string
): ScheduledWorkerTemplateValues => {
  const storedInterval = (values as { scheduleInterval?: unknown }).scheduleInterval;
  if (storedInterval !== undefined) {
    return values;
  }
  return { ...values, scheduleInterval: scheduleIntervalDefault };
};

export const renderScheduledWorkerYaml = (
  yaml: string,
  values: ScheduledWorkerTemplateValues
): string =>
  renderCommonWorkerYaml(yaml, values).replaceAll(
    '__WORKER_SCHEDULE_INTERVAL__',
    values.scheduleInterval
  );

export const renderAttackDiscoveryWorkerYaml = (
  yaml: string,
  values: ScheduledWorkerTemplateValues
): string =>
  renderScheduledWorkerYaml(
    yaml,
    withScheduleDefault(values, ATTACK_DISCOVERY_SCHEDULE_INTERVAL_DEFAULT)
  );

/**
 * Worker-specific settings are stored under `extras`, mirroring the Worker settings API, so a
 * settings save re-renders YAML and the per-space Worker can pass them to the sweep. The shape is
 * declared once, in `RuleTuningWorkerExtras` in `@kbn/alertzero-common`; this mirrors it for typing.
 */
export interface RuleTuningWorkerTemplateValues extends ScheduledWorkerTemplateValues {
  extras: {
    analysisWindowDays: number;
    fpCountThreshold: number;
    fpRateThresholdPct: number;
  };
}

export const renderRuleTuningWorkerYaml = (
  yaml: string,
  values: RuleTuningWorkerTemplateValues
): string => {
  const storedExtras = (values as { extras?: unknown }).extras;
  // Stored keys win. An absent object or an absent key takes the declaration default;
  // a non-object is left as stored so a wrong type still renders as itself.
  const extras = isPlainObject(storedExtras)
    ? { ...RULE_TUNING_EXTRAS_DEFAULTS, ...storedExtras }
    : storedExtras === undefined
    ? { ...RULE_TUNING_EXTRAS_DEFAULTS }
    : storedExtras;

  // JSON is a YAML flow mapping, so the whole object lands under consts in one substitution.
  return renderScheduledWorkerYaml(
    yaml,
    withScheduleDefault(values, RULE_TUNING_SCHEDULE_INTERVAL_DEFAULT)
  ).replaceAll('__WORKER_EXTRAS__', JSON.stringify(extras));
};
