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
  steps?: IParsedStep[];
  with?: Record<string, unknown>;
}

interface IParsedWorkflow {
  settings?: Record<string, unknown>;
  triggers?: Array<{ type: string }>;
  steps: IParsedStep[];
}

const startedBySchedule: Array<[string, string]> = [
  ['cleanup', BOUND_CLEANUP_YAML],
  ['sync', BOUND_SYNC_YAML],
  ['continuous onboarding', BOUND_CONTINUOUS_ONBOARDING_YAML],
  ['scheduled detection', BOUND_SCHEDULED_DETECTION_YAML],
  ['scheduled review', BOUND_SCHEDULED_REVIEW_YAML],
];

const startedByServerCode: Array<[string, string]> = [
  ['onboarding', BOUND_ONBOARDING_YAML],
  ['discovery', BOUND_ORCHESTRATOR_YAML],
  ['source reconciliation', BOUND_SOURCE_RECONCILIATION_YAML],
];

const collectSteps = (steps: IParsedStep[]): IParsedStep[] =>
  steps.flatMap((step) => [step, ...collectSteps(step.steps ?? [])]);

describe('bound detection engine workflows', () => {
  // Anyone allowed to run workflows can start one through the generic run API, with any inputs,
  // and a bound workflow runs as its service account whoever starts it.
  it.each([...startedBySchedule, ...startedByServerCode])(
    '%s refuses direct runs before doing anything',
    (_name, yaml) => {
      const { steps }: IParsedWorkflow = parse(yaml);

      expect(steps[0]).toMatchObject({ name: 'refuse_direct_runs', type: 'if' });
      expect(steps[0].condition).toMatch(/^not execution\.triggeredBy : /);
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

      expect(steps[0].condition).toBe(
        `not execution.triggeredBy : "${NIGHTSHIFT_DETECTION_ENGINE_TRIGGER_SOURCE}"`
      );
    }
  );

  it.each(startedBySchedule)('%s refuses every run but the schedule', (_name, yaml) => {
    const { steps }: IParsedWorkflow = parse(yaml);

    expect(steps[0].condition).toBe('not execution.triggeredBy : "scheduled"');
  });

  // A child workflow only runs as the account when the call says so.
  it.each([
    [
      'onboarding',
      BOUND_ONBOARDING_YAML,
      ['system-streams-ki-features-identification', 'system-streams-ki-queries-generation'],
    ],
    [
      'orchestrator',
      BOUND_ORCHESTRATOR_YAML,
      ['system-significant-events-detection', 'system-significant-events-discovery'],
    ],
  ])('%s hands its work down with the identity of the account', (_name, yaml, childIds) => {
    const workflow: IParsedWorkflow = parse(yaml);
    const children = collectSteps(workflow.steps).filter(({ type }) => type === 'workflow.execute');

    expect(children.map(({ with: args }) => args?.['workflow-id'])).toEqual(childIds);
    children.forEach(({ with: args }) => expect(args?.['run-as-mode']).toBe('inherit'));
  });

  // A workflow-level `continue` would swallow the failure of the refusal step and run the rest.
  it.each([...startedBySchedule, ...startedByServerCode])(
    '%s does not continue past a failed step by default',
    (_name, yaml) => {
      const { settings }: IParsedWorkflow = parse(yaml);

      expect(settings?.['on-failure']).toBeUndefined();
    }
  );
});
