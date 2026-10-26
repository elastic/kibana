/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  renderScheduledWorkerYaml,
  type ScheduledWorkerTemplateValues,
} from '../worker_template_values';

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
 * Hunt always emits scheduled (locked 4h default) plus manual with optional reportIds.
 * Autonomy is fixed Manual; the schedule still runs on its own.
 */
export const renderHuntWorkerYaml = (yaml: string, values: HuntWorkerTemplateValues): string => {
  const triggers = [
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
