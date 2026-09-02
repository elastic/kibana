/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import CONTINUOUS_ONBOARDING_YAML from './knowledge_indicators/continuous_onboarding.yaml';
import ONBOARDING_YAML from './knowledge_indicators/onboarding.yaml';
import SCHEDULED_REVIEW_YAML from './scheduled_review.yaml';
import DISCOVERY_YAML from './significant_events/discovery.yaml';

interface WorkflowStep {
  name: string;
  type: string;
  if?: string;
  condition?: string;
  status?: string;
  timeout?: string;
  with?: {
    path?: string;
    inputs?: Record<string, unknown>;
    [key: string]: unknown;
  };
  'on-failure'?: {
    continue?: boolean;
    retry?: unknown;
  };
  steps?: WorkflowStep[];
}

interface WorkflowDefinition {
  triggers: Array<{
    type: string;
    inputs?: Array<{ name: string; type: string }>;
  }>;
  steps: WorkflowStep[];
}

const definitions = {
  scheduledReview: parse(SCHEDULED_REVIEW_YAML) as WorkflowDefinition,
  continuousOnboarding: parse(CONTINUOUS_ONBOARDING_YAML) as WorkflowDefinition,
  discovery: parse(DISCOVERY_YAML) as WorkflowDefinition,
  onboarding: parse(ONBOARDING_YAML) as WorkflowDefinition,
};

const flattenSteps = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.flatMap((step) => [step, ...(step.steps ? flattenSteps(step.steps) : [])]);

const findStep = (definition: WorkflowDefinition, name: string): WorkflowStep => {
  const step = flattenSteps(definition.steps).find((candidate) => candidate.name === name);
  if (!step) {
    throw new Error(`Missing workflow step ${name}`);
  }
  return step;
};

const findInput = (
  definition: WorkflowDefinition,
  name: string
): { name: string; type: string } | undefined =>
  definition.triggers
    .flatMap((trigger) => trigger.inputs ?? [])
    .find((input) => input.name === name);

describe('Significant Events run quota workflow invariants', () => {
  it('gives every heartbeat and gate scheduled provenance, a timeout, and fail-open behavior', () => {
    const quotaSteps = Object.values(definitions).flatMap((definition) =>
      flattenSteps(definition.steps).filter(
        (step) => step.type === 'kibana.request' && step.with?.path?.includes('/run_quotas/')
      )
    );

    expect(quotaSteps.map(({ name }) => name).sort()).toEqual(
      [
        'check_budget',
        'check_budget',
        'report_run_quota_heartbeat',
        'report_run_quota_heartbeat',
        'reserve_investigation_budget',
      ].sort()
    );
    for (const step of quotaSteps) {
      expect(step.if).toMatch(/== "scheduled"/);
      expect(step.timeout).toBe('10s');
      expect(step['on-failure']).toEqual({ continue: true });
      expect(step['on-failure']).not.toHaveProperty('retry');
      expect(step.with?.path).toMatch(/^\/s\/\{\{ workflow\.spaceId \}\}\//);
    }
  });

  it('places heartbeats and worker gates before eligibility or expensive work', () => {
    expect(definitions.scheduledReview.steps[0].name).toBe('report_run_quota_heartbeat');
    expect(definitions.continuousOnboarding.steps[0].name).toBe('report_run_quota_heartbeat');
    expect(definitions.continuousOnboarding.steps[1].name).toBe('get_eligible');
    expect(definitions.discovery.steps[0].name).toBe('check_budget');
    expect(definitions.onboarding.steps[0].name).toBe('check_budget');
  });

  it('propagates scheduled origin and a numeric detection quota slot', () => {
    const scheduledDiscover = findStep(definitions.scheduledReview, 'discover');
    const continuousOnboarding = findStep(definitions.continuousOnboarding, 'schedule_onboarding');

    expect(scheduledDiscover.with?.inputs).toEqual(
      expect.objectContaining({
        rootTriggeredBy: '${{ execution.triggeredBy }}',
        quotaSlot: '${{ while.iteration }}',
      })
    );
    expect(continuousOnboarding.with?.inputs).toEqual(
      expect.objectContaining({ rootTriggeredBy: '${{ execution.triggeredBy }}' })
    );
  });

  it('declares the propagated worker inputs with their canonical types', () => {
    expect(findInput(definitions.discovery, 'rootTriggeredBy')).toEqual(
      expect.objectContaining({
        name: 'rootTriggeredBy',
        type: 'string',
      })
    );
    expect(findInput(definitions.discovery, 'quotaSlot')).toEqual(
      expect.objectContaining({
        name: 'quotaSlot',
        type: 'number',
      })
    );
    expect(findInput(definitions.onboarding, 'rootTriggeredBy')).toEqual(
      expect.objectContaining({
        name: 'rootTriggeredBy',
        type: 'string',
      })
    );
  });

  it('returns normal no-work outputs on an explicit worker denial', () => {
    expect(findStep(definitions.discovery, 'exit_if_budget_denied')).toEqual(
      expect.objectContaining({
        condition: '${{ steps.check_budget.output.allowed == false }}',
        steps: [
          expect.objectContaining({
            type: 'workflow.output',
            with: {
              processedCount: 0,
              hasWork: false,
              suppressedRuleCount: 0,
            },
          }),
        ],
      })
    );
    expect(findStep(definitions.onboarding, 'output_budget_denied')).toEqual(
      expect.objectContaining({
        status: 'cancelled',
        with: {
          streamName: '${{ inputs.streamName }}',
          featuresSkipped: true,
          featuresConnectorUsed: '',
          discoveredFeatures: [],
          featuresTokensUsed: { prompt: 0, completion: 0, total: 0 },
          queriesSkipped: true,
          queriesConnectorUsed: '',
          persistedQueries: [],
          queriesTokensUsed: { prompt: 0, completion: 0, total: 0 },
          keepAliveRefreshed: 0,
        },
      })
    );
  });

  it('fails open only after the per-event reservation gate', () => {
    const reserve = findStep(definitions.discovery, 'reserve_investigation_budget');
    const grantGuard = findStep(definitions.discovery, 'guard_investigation_budget');

    expect(reserve.with?.path).toContain('/run_quotas/investigation/_reserve');
    expect(grantGuard.condition).toBe(
      '${{ steps.reserve_investigation_budget.output.granted != false }}'
    );
    expect(grantGuard.steps?.[0]).toEqual(
      expect.objectContaining({
        name: 'trigger_investigation',
        type: 'workflow.executeAsync',
      })
    );
  });
});
