/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import ONBOARDING_YAML from './onboarding.yaml';
import { createWorkflowLiquidEngine } from '../../../../common/utils';

interface WorkflowStep {
  name: string;
  type: string;
  condition?: string;
  steps?: WorkflowStep[];
  else?: WorkflowStep[];
  with?: {
    path?: string;
    'workflow-id'?: string;
  };
}

const workflow = parse(ONBOARDING_YAML) as { steps: WorkflowStep[] };
const metricsBranch = workflow.steps.find(({ name }) => name === 'run_metrics_source_onboarding');
const sourceBranch = workflow.steps.find(({ name }) => name === 'run_source_onboarding');

const conditionMatches = (
  step: WorkflowStep | undefined,
  {
    sourceType,
    metricsEntitiesHandled,
  }: {
    sourceType: string;
    metricsEntitiesHandled: boolean;
  }
): boolean => {
  expect(step?.condition).toBeDefined();
  const expression = step?.condition?.slice(3, -2).trim() ?? '';
  return Boolean(
    createWorkflowLiquidEngine().evalValueSync(expression, {
      inputs: { sourceType },
      variables: { metricsEntitiesHandled },
    })
  );
};

const sourceSteps = (metricsEntitiesHandled: boolean): WorkflowStep[] =>
  conditionMatches(sourceBranch, {
    sourceType: 'metrics',
    metricsEntitiesHandled,
  })
    ? sourceBranch?.steps ?? []
    : [];

const collectStepsByType = (steps: WorkflowStep[], type: string): WorkflowStep[] =>
  steps.flatMap((step) => [
    ...(step.type === type ? [step] : []),
    ...collectStepsByType(step.steps ?? [], type),
    ...collectStepsByType(step.else ?? [], type),
  ]);

describe('KI onboarding workflow metrics branch', () => {
  it('falls back to the features and queries path when metrics entities are not handled', () => {
    const steps = sourceSteps(false);

    expect(steps.map(({ name }) => name)).toEqual([
      'check_should_identify',
      'run_features',
      'check_should_generate_queries',
      'run_queries',
    ]);
    expect(
      collectStepsByType(steps, 'workflow.execute').map((step) => step.with?.['workflow-id'])
    ).toEqual([
      'system-streams-ki-features-identification',
      'system-streams-ki-queries-generation',
    ]);
  });

  it('skips the features and queries path when metrics entities are handled', () => {
    const steps = sourceSteps(true);

    expect(steps).toEqual([]);
    expect(metricsBranch?.steps?.find(({ name }) => name === 'run_metrics_entities')).toEqual(
      expect.objectContaining({
        with: expect.objectContaining({
          path: '/s/{{ workflow.spaceId }}/internal/streams/{{ inputs.sourceId }}/features/_identify/metrics_entities',
        }),
      })
    );
    expect(
      conditionMatches(metricsBranch, {
        sourceType: 'metrics',
        metricsEntitiesHandled: true,
      })
    ).toBe(true);
  });
});
