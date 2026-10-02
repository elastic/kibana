/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SECURITY_INVESTIGATIONS_AI_INDEX_ID,
  SECURITY_INVESTIGATIONS_AI_INDEX_ID_TOKEN,
} from './security_investigations_ai_index';
import type { ManagedWorkflowTemplateValues } from '../../types';

export interface CommonWorkerTemplateValues extends ManagedWorkflowTemplateValues {
  settingsVersion: number;
  autonomyLevel: 'manual' | 'assisted' | 'supervised';
}

/**
 * Substitutes the shared investigations AI index id. Worker settings placeholders
 * are substituted only when values are given, so a static definition can render
 * the index id alone.
 */
export const renderCommonWorkerYaml = (
  yaml: string,
  values?: CommonWorkerTemplateValues
): string => {
  const result = yaml.replaceAll(
    SECURITY_INVESTIGATIONS_AI_INDEX_ID_TOKEN,
    SECURITY_INVESTIGATIONS_AI_INDEX_ID
  );
  if (!values) {
    return result;
  }
  return result
    .replaceAll('__WORKER_SETTINGS_VERSION__', String(values.settingsVersion))
    .replaceAll('__WORKER_AUTONOMY_LEVEL__', values.autonomyLevel);
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

export type HuntWorkerTemplateValues = ScheduledWorkerTemplateValues;

/**
 * Hunt Watch Continuous Threat Hunt has no configurable dials: enabled/disabled
 * (autonomy) and the schedule interval are its only settings. tier2When, candidateLimit,
 * and fanOutMax are fixed implementation constants.
 */
const HUNT_WORKER_DEFAULTS = {
  tier2When: 'always' as const,
  candidateLimit: 10,
  fanOutMax: 10,
};

/**
 * The manual trigger's optional `reportIds` input: a manual-bypass
 * fan-out over named reports, capped at 10 to match `create_proposal.yaml`'s
 * trigger-input shape and the candidates route's own `report_ids` bound. Present on
 * every autonomy level's manual trigger, scheduled or not.
 */
const MANUAL_TRIGGER_WITH_REPORT_IDS_INPUT = [
  '  - type: manual',
  '    inputs:',
  '      properties:',
  '        reportIds:',
  '          type: array',
  '          items:',
  '            type: string',
  '          maxItems: 10',
].join('\n');

/**
 * Manual autonomy: manual trigger only. Assisted/supervised: 4h (or configured)
 * schedule plus manual.
 */
export const renderHuntWorkerYaml = (yaml: string, values: HuntWorkerTemplateValues): string => {
  const triggers =
    values.autonomyLevel === 'manual'
      ? MANUAL_TRIGGER_WITH_REPORT_IDS_INPUT
      : [
          '  - type: scheduled',
          '    with:',
          `      every: ${JSON.stringify(values.scheduleInterval)}`,
          MANUAL_TRIGGER_WITH_REPORT_IDS_INPUT,
        ].join('\n');

  return renderScheduledWorkerYaml(yaml, values)
    .replaceAll('__WORKER_TRIGGERS__', triggers)
    .replaceAll('__WORKER_TIER2_WHEN__', JSON.stringify(HUNT_WORKER_DEFAULTS.tier2When))
    .replaceAll('__WORKER_CANDIDATE_LIMIT__', String(HUNT_WORKER_DEFAULTS.candidateLimit))
    .replaceAll('__WORKER_FAN_OUT_MAX__', String(HUNT_WORKER_DEFAULTS.fanOutMax));
};

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
