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
import BOUND_ONBOARDING_YAML from './knowledge_indicators/bound_onboarding.yaml';
import BOUND_SOURCE_RECONCILIATION_YAML from './knowledge_indicators/bound_source_reconciliation.yaml';
import BOUND_SYNC_YAML from './knowledge_indicators/bound_sync.yaml';
import ONBOARDING_YAML from './knowledge_indicators/onboarding.yaml';
import BOUND_ORCHESTRATOR_YAML from './significant_events/bound_orchestrator.yaml';
import ORCHESTRATOR_YAML from './significant_events/orchestrator.yaml';

interface IParsedStep {
  name: string;
  type: string;
  condition?: string;
  steps?: IParsedStep[];
  with?: Record<string, unknown>;
}

interface IParsedWorkflow {
  triggers?: Array<{ type: string }>;
  steps: IParsedStep[];
}

const collectChildCalls = (steps: IParsedStep[]): IParsedStep[] =>
  steps.flatMap((step) => [
    ...(step.type === 'workflow.execute' ? [step] : []),
    ...collectChildCalls(step.steps ?? []),
  ]);

const startedBySchedule: Array<[string, string]> = [
  ['cleanup', BOUND_CLEANUP_YAML],
  ['sync', BOUND_SYNC_YAML],
];

const startedByServerCode: Array<[string, string]> = [
  ['onboarding', BOUND_ONBOARDING_YAML],
  ['discovery', BOUND_ORCHESTRATOR_YAML],
  ['source reconciliation', BOUND_SOURCE_RECONCILIATION_YAML],
];

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

      expect(steps[0].condition).toBe('not execution.triggeredBy : "nightshift-detection-engine"');
    }
  );

  it.each(startedBySchedule)('%s refuses every run but the schedule', (_name, yaml) => {
    const { steps }: IParsedWorkflow = parse(yaml);

    expect(steps[0].condition).toBe('not execution.triggeredBy : "scheduled"');
  });

  // A child workflow only runs as the account when the call says so.
  it.each([
    ['onboarding', BOUND_ONBOARDING_YAML, 'system-streams-ki-onboarding'],
    ['discovery', BOUND_ORCHESTRATOR_YAML, 'system-significant-events-orchestrator'],
  ])('%s hands its work down with the identity of the account', (_name, yaml, childId) => {
    const { steps }: IParsedWorkflow = parse(yaml);

    expect(steps.find(({ type }) => type === 'workflow.execute')).toMatchObject({
      with: { 'workflow-id': childId, 'run-as-mode': 'inherit' },
    });
  });

  // The bound entry point only covers the first hop: a child started without `inherit` runs as
  // the original request, so the shared workflows must pass the identity on at every level.
  it.each([
    ['onboarding', ONBOARDING_YAML],
    ['orchestrator', ORCHESTRATOR_YAML],
  ])('shared %s passes the identity to every child workflow', (_name, yaml) => {
    const { steps }: IParsedWorkflow = parse(yaml);

    const children = collectChildCalls(steps);

    expect(children.length).toBeGreaterThan(0);
    expect(children.filter((step) => step.with?.['run-as-mode'] !== 'inherit')).toEqual([]);
  });
});
