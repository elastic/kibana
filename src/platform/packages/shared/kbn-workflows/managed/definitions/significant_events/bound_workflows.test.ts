/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import BOUND_CLEANUP_YAML from './bound_cleanup.yaml';
import BOUND_INVESTIGATION_COMPLETED_YAML from './bound_investigation_completed.yaml';
import BOUND_SCHEDULED_DETECTION_YAML from './bound_scheduled_detection.yaml';
import BOUND_SCHEDULED_REVIEW_YAML from './bound_scheduled_review.yaml';
import BOUND_CONTINUOUS_ONBOARDING_YAML from './knowledge_indicators/bound_continuous_onboarding.yaml';
import BOUND_ONBOARDING_YAML from './knowledge_indicators/bound_onboarding.yaml';
import BOUND_SOURCE_RECONCILIATION_YAML from './knowledge_indicators/bound_source_reconciliation.yaml';
import BOUND_SYNC_YAML from './knowledge_indicators/bound_sync.yaml';
import BOUND_ORCHESTRATOR_YAML from './significant_events/bound_orchestrator.yaml';
import { NIGHTSHIFT_DETECTION_ENGINE_TRIGGER_SOURCE } from './trigger_source';

interface IParsedStep {
  name: string;
  type: string;
  condition?: string;
  steps?: Array<{ type: string }>;
}

interface IParsedWorkflow {
  settings?: { run_as?: string };
  triggers?: Array<{ type: string }>;
  steps: IParsedStep[];
}

const startedBySchedule: Array<[string, string]> = [
  ['cleanup', BOUND_CLEANUP_YAML],
  ['scheduled detection', BOUND_SCHEDULED_DETECTION_YAML],
  ['scheduled review', BOUND_SCHEDULED_REVIEW_YAML],
  ['sync', BOUND_SYNC_YAML],
  ['continuous onboarding', BOUND_CONTINUOUS_ONBOARDING_YAML],
];

const startedByServerCode: Array<[string, string]> = [
  ['onboarding', BOUND_ONBOARDING_YAML],
  ['discovery', BOUND_ORCHESTRATOR_YAML],
  ['source reconciliation', BOUND_SOURCE_RECONCILIATION_YAML],
];

describe('bound detection engine workflows', () => {
  // Anyone allowed to run workflows can start one through the generic run API, with any inputs,
  // and a bound workflow runs as its service account whoever starts it.
  it.each([
    ...startedBySchedule,
    ...startedByServerCode,
    ['investigation completed', BOUND_INVESTIGATION_COMPLETED_YAML],
  ])(
    '%s runs as the service account and refuses direct runs before doing anything',
    (_name, yaml) => {
      const { settings, steps }: IParsedWorkflow = parse(yaml);

      expect(settings?.run_as).toBe('__SERVICE_ACCOUNT_ID__');
      expect(steps[0]).toMatchObject({ name: 'refuse_direct_runs', type: 'if' });
      expect(steps[0].condition).toContain('execution.triggeredBy');
      expect(steps[0].steps?.[0].type).toBe('workflow.fail');
    }
  );

  it.each(startedBySchedule)('%s has no manual trigger', (_name, yaml) => {
    const { triggers }: IParsedWorkflow = parse(yaml);

    expect(triggers?.map(({ type }) => type)).toEqual(['scheduled']);
  });

  it.each(startedByServerCode)(
    '%s accepts only runs the detection engine starts',
    (_name, yaml) => {
      const { steps }: IParsedWorkflow = parse(yaml);

      expect(steps[0].condition).toContain(`"${NIGHTSHIFT_DETECTION_ENGINE_TRIGGER_SOURCE}"`);
    }
  );
});
