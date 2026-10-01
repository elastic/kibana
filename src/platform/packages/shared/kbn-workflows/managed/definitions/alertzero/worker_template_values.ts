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
  /** Omitted to run as the current user, which drops `settings.run_as` from the YAML. */
  serviceAccountId?: string;
}

const RUN_AS_LINE_PLACEHOLDER = '  __WORKER_RUN_AS_LINE__\n';
const RUN_AS_BLOCK_PLACEHOLDER = '__WORKER_RUN_AS_BLOCK__\n';
/** Parses as a null key so the template is valid YAML. Replaced before the bare placeholder. */
const RUN_AS_BLOCK_KEY_PLACEHOLDER = '__WORKER_RUN_AS_BLOCK__:\n';

/** `run_as` is optional. A missing id removes the line; an empty value is not valid YAML. */
const renderRunAs = (serviceAccountId: string | undefined): { line: string; block: string } => {
  if (!serviceAccountId) {
    return { line: '', block: '' };
  }
  const line = `  run_as: ${JSON.stringify(serviceAccountId)}\n`;
  return { line, block: `settings:\n${line}` };
};

export const renderCommonWorkerYaml = (
  yaml: string,
  { settingsVersion, autonomyLevel, serviceAccountId }: CommonWorkerTemplateValues
): string => {
  const runAs = renderRunAs(serviceAccountId);
  return yaml
    .replaceAll('__WORKER_SETTINGS_VERSION__', String(settingsVersion))
    .replaceAll('__WORKER_AUTONOMY_LEVEL__', autonomyLevel)
    .replaceAll(RUN_AS_LINE_PLACEHOLDER, runAs.line)
    .replaceAll(RUN_AS_BLOCK_KEY_PLACEHOLDER, runAs.block)
    .replaceAll(RUN_AS_BLOCK_PLACEHOLDER, runAs.block);
};

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
): string =>
  // JSON is a YAML flow mapping, so the whole object lands under consts in one substitution.
  renderScheduledWorkerYaml(yaml, values).replaceAll(
    '__WORKER_EXTRAS__',
    JSON.stringify(values.extras)
  );

export interface AlertTriageWorkerTemplateValues extends CommonWorkerTemplateValues {
  extras: {
    autoCloseConfidenceScoreMinThreshold: number;
  };
}

export const renderAlertTriageWorkerYaml = (
  yaml: string,
  values: AlertTriageWorkerTemplateValues
): string =>
  renderCommonWorkerYaml(yaml, values).replaceAll(
    '__WORKER_AUTO_CLOSE_CONFIDENCE_MIN_THRESHOLD__',
    String(values.extras.autoCloseConfidenceScoreMinThreshold)
  );

export interface RuleCoverageWorkerTemplateValues extends ScheduledWorkerTemplateValues {
  extras: {
    lookbackDays: number;
    maxGapsPerRun: number;
  };
}

export const renderRuleCoverageWorkerYaml = (
  yaml: string,
  values: RuleCoverageWorkerTemplateValues
): string =>
  renderScheduledWorkerYaml(yaml, values).replaceAll(
    '__WORKER_EXTRAS__',
    JSON.stringify(values.extras)
  );
