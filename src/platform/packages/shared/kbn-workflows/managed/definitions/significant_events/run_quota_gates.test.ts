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
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface WorkflowStep {
  name: string;
  type: string;
  if?: string;
  condition?: string;
  status?: string;
  timeout?: string;
  with?: {
    path?: string;
    body?: Record<string, unknown>;
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

const quotaSteps = Object.values(definitions).flatMap((definition) =>
  flattenSteps(definition.steps).filter(
    (step) => step.type === 'kibana.request' && step.with?.path?.includes('/run_quotas/')
  )
);

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

const stepIndex = (definition: WorkflowDefinition, name: string): number =>
  flattenSteps(definition.steps).findIndex((step) => step.name === name);

const evaluateExpression = (expression: string, context: Record<string, unknown>): unknown =>
  createWorkflowLiquidEngine().evalValueSync(expression.slice(3, -2).trim(), context);

const evaluateStepCondition = (step: WorkflowStep, context: Record<string, unknown>): unknown => {
  if (!step.condition) {
    throw new Error(`Missing condition for workflow step ${step.name}`);
  }
  return evaluateExpression(step.condition, context);
};

describe('Significant Events run quota workflow contracts', () => {
  it('propagates scheduled and manual origins from both managed drivers', () => {
    const scheduledReviewWorker = findStep(definitions.scheduledReview, 'discover');
    const continuousKiWorker = findStep(definitions.continuousOnboarding, 'schedule_onboarding');

    for (const worker of [scheduledReviewWorker, continuousKiWorker]) {
      const rootTriggeredBy = worker.with?.inputs?.rootTriggeredBy;
      expect(rootTriggeredBy).toBe('${{ execution.triggeredBy }}');
      expect(
        evaluateExpression(rootTriggeredBy as string, {
          execution: { triggeredBy: 'scheduled' },
        })
      ).toBe('scheduled');
      expect(
        evaluateExpression(rootTriggeredBy as string, {
          execution: { triggeredBy: 'manual' },
        })
      ).toBe('manual');
    }
  });

  it('runs all three gates only for workers whose root origin is scheduled', () => {
    expect(quotaSteps.map((step) => step.with?.body?.group).sort()).toEqual(
      ['detection', 'investigation', 'ki_extraction'].sort()
    );

    for (const step of quotaSteps) {
      expect(step.if).toBe('${{ inputs.rootTriggeredBy == "scheduled" }}');
      expect(
        evaluateExpression(step.if as string, { inputs: { rootTriggeredBy: 'scheduled' } })
      ).toBe(true);
      expect(evaluateExpression(step.if as string, { inputs: { rootTriggeredBy: 'manual' } })).toBe(
        false
      );
      expect(evaluateExpression(step.if as string, { inputs: {} })).toBe(false);
    }
  });

  it('uses a space-prefixed fail-open request without retries for every gate', () => {
    for (const step of quotaSteps) {
      expect(step.with?.path).toBe(
        '/s/{{ workflow.spaceId }}/internal/significant_events/run_quotas/_consume'
      );
      expect(step.timeout).toBe('10s');
      expect(step['on-failure']).toEqual({ continue: true });
      expect(step['on-failure']).not.toHaveProperty('retry');
    }
  });

  it('places discovery and KI gates before their expensive work', () => {
    expect(definitions.discovery.steps.slice(0, 3).map(({ name }) => name)).toEqual([
      'bootstrap_cleanup_workflow',
      'check_budget',
      'exit_if_budget_denied',
    ]);
    expect(definitions.onboarding.steps.slice(0, 2).map(({ name }) => name)).toEqual([
      'check_budget',
      'exit_if_budget_denied',
    ]);
    expect(stepIndex(definitions.discovery, 'check_budget')).toBeLessThan(
      stepIndex(definitions.discovery, 'get_detections')
    );
    expect(stepIndex(definitions.discovery, 'check_budget')).toBeLessThan(
      stepIndex(definitions.discovery, 'run_discovery_agent')
    );
    expect(stepIndex(definitions.onboarding, 'check_budget')).toBeLessThan(
      stepIndex(definitions.onboarding, 'identify_features')
    );
  });

  it('stops workers only on an explicit denial and returns valid outputs', () => {
    const discoveryDenial = findStep(definitions.discovery, 'exit_if_budget_denied');
    const onboardingDenial = findStep(definitions.onboarding, 'exit_if_budget_denied');

    expect(
      evaluateStepCondition(discoveryDenial, {
        steps: { check_budget: { output: { allowed: false } } },
      })
    ).toBe(true);
    expect(
      evaluateStepCondition(onboardingDenial, {
        steps: { check_budget: { output: { allowed: false } } },
      })
    ).toBe(true);
    expect(evaluateStepCondition(discoveryDenial, { steps: { check_budget: {} } })).toBe(false);
    expect(evaluateStepCondition(onboardingDenial, { steps: { check_budget: {} } })).toBe(false);

    expect(discoveryDenial.steps).toEqual([
      expect.objectContaining({
        type: 'workflow.output',
        with: {
          processedCount: 0,
          hasWork: false,
          suppressedRuleCount: 0,
        },
      }),
    ]);
    expect(findStep(definitions.onboarding, 'output_budget_denied')).toEqual(
      expect.objectContaining({
        type: 'workflow.output',
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

  it('gates investigations after eligibility, event resolution, and deduplication but before launch', () => {
    const orderedSteps = [
      'gate_investigatable_severity',
      'resolve_open_event',
      'check_prior_investigation',
      'guard_resolved_event',
      'guard_missing_investigation',
      'consume_investigation_quota',
      'guard_investigation_quota',
      'trigger_investigation',
    ];
    const indexes = orderedSteps.map((name) => stepIndex(definitions.discovery, name));

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
  });

  it('derives investigation criticality from the resolved event severity', () => {
    const gate = findStep(definitions.discovery, 'consume_investigation_quota');
    const critical = gate.with?.body?.critical;

    expect(critical).toBe(
      '${{ steps.resolve_open_event.output.hits.hits[0]._source.severity == "80-critical" }}'
    );
    expect(
      evaluateExpression(critical as string, {
        steps: {
          resolve_open_event: {
            output: { hits: { hits: [{ _source: { severity: '80-critical' } }] } },
          },
        },
      })
    ).toBe(true);
    expect(
      evaluateExpression(critical as string, {
        steps: {
          resolve_open_event: {
            output: { hits: { hits: [{ _source: { severity: '60-high' } }] } },
          },
        },
      })
    ).toBe(false);
  });

  it('prevents investigation launch only on explicit denial', () => {
    const guard = findStep(definitions.discovery, 'guard_investigation_quota');

    expect(
      evaluateStepCondition(guard, {
        steps: { consume_investigation_quota: { output: { allowed: false } } },
      })
    ).toBe(false);
    expect(
      evaluateStepCondition(guard, {
        steps: { consume_investigation_quota: { output: { allowed: true } } },
      })
    ).toBe(true);
    expect(
      evaluateStepCondition(guard, {
        steps: { consume_investigation_quota: {} },
      })
    ).toBe(true);
    expect(guard.steps?.[0]).toEqual(
      expect.objectContaining({
        name: 'trigger_investigation',
        type: 'workflow.executeAsync',
      })
    );
  });

  it('keeps only the root origin worker input', () => {
    expect(findInput(definitions.discovery, 'rootTriggeredBy')).toEqual(
      expect.objectContaining({
        name: 'rootTriggeredBy',
        type: 'string',
      })
    );
    expect(findInput(definitions.onboarding, 'rootTriggeredBy')).toEqual(
      expect.objectContaining({
        name: 'rootTriggeredBy',
        type: 'string',
      })
    );
    expect(findInput(definitions.discovery, 'quotaSlot')).toBeUndefined();
    expect(findInput(definitions.onboarding, 'quotaSlot')).toBeUndefined();
  });
});
