/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
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
const sourceBranch = workflow.steps.find(({ name }) => name === 'run_source_onboarding');

const branchSteps = (sourceType: string, metricsEntitiesEnabled: boolean): WorkflowStep[] => {
  expect(sourceBranch?.condition).toBeDefined();
  const expression = sourceBranch?.condition?.slice(3, -2).trim() ?? '';
  const takeMetricsPath = Boolean(
    createWorkflowLiquidEngine().evalValueSync(expression, {
      inputs: { sourceType, metricsEntitiesEnabled },
    })
  );
  return takeMetricsPath ? sourceBranch?.steps ?? [] : sourceBranch?.else ?? [];
};

const collectStepsByType = (steps: WorkflowStep[], type: string): WorkflowStep[] =>
  steps.flatMap((step) => [
    ...(step.type === type ? [step] : []),
    ...collectStepsByType(step.steps ?? [], type),
    ...collectStepsByType(step.else ?? [], type),
  ]);

describe('KI onboarding workflow metrics branch', () => {
  it('runs metrics entity extraction without the features or queries workflows', () => {
    const steps = branchSteps('metrics', true);

    expect(collectStepsByType(steps, 'workflow.execute')).toEqual([]);
    expect(collectStepsByType(steps, 'kibana.request')).toEqual([
      expect.objectContaining({
        name: 'run_metrics_entities',
        with: expect.objectContaining({
          path: '/s/{{ workflow.spaceId }}/internal/streams/{{ inputs.sourceId }}/features/_identify/metrics_entities',
        }),
      }),
    ]);
  });

  it('keeps the existing features and queries workflows for logs sources', () => {
    const steps = branchSteps('logs', true);

    expect(
      collectStepsByType(steps, 'workflow.execute').map((step) => step.with?.['workflow-id'])
    ).toEqual([
      'system-streams-ki-features-identification',
      'system-streams-ki-queries-generation',
    ]);
    expect(steps.some(({ name }) => name === 'run_metrics_entities')).toBe(false);
  });
});
