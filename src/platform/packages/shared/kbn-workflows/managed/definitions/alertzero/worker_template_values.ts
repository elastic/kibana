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

/**
 * Hunt Watch Continuous Threat Hunt dials. Shape mirrors
 * `ContinuousThreatHuntWorkerExtras` in `@kbn/alertzero-common`. Individual
 * placeholders (not a whole extras blob) so Phase 3 can drop them into
 * `kibana.request` bodies and child inputs without a nested lookup.
 */
export interface HuntWorkerTemplateValues extends ScheduledWorkerTemplateValues {
  extras: {
    tier2When: 'on_hits' | 'always';
    candidateLimit: number;
    fanOutMax: number;
    technology?: 'aws_iam' | 'fortigate';
  };
}

/**
 * Manual autonomy: manual trigger only. Assisted/supervised: 4h (or configured)
 * schedule plus manual. String dials are JSON-escaped so a value with quotes or
 * newlines cannot break the YAML parse. Absent `technology` renders as "" so the
 * child/coordinator treat it as unset. `extras` is also rendered whole (settings
 * contract), matching Rule Tuning.
 */
/**
 * The manual trigger's optional `reportIds` input (Phase 3 task 2): a manual-bypass
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
    .replaceAll('__WORKER_EXTRAS__', JSON.stringify(values.extras))
    .replaceAll('__WORKER_TIER2_WHEN__', JSON.stringify(values.extras.tier2When))
    .replaceAll('__WORKER_CANDIDATE_LIMIT__', String(values.extras.candidateLimit))
    .replaceAll('__WORKER_FAN_OUT_MAX__', String(values.extras.fanOutMax))
    .replaceAll('__WORKER_TECHNOLOGY__', JSON.stringify(values.extras.technology ?? ''));
};
