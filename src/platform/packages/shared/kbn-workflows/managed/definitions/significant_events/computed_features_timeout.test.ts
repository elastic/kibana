/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import FEATURES_IDENTIFICATION_YAML from './knowledge_indicators/features_identification.yaml';
import ONBOARDING_YAML from './knowledge_indicators/onboarding.yaml';

interface WorkflowStep {
  name: string;
  type: string;
  with?: {
    body?: Record<string, unknown>;
    inputs?: Record<string, unknown>;
    [key: string]: unknown;
  };
  steps?: WorkflowStep[];
}

interface WorkflowInput {
  name: string;
  type: string;
  default?: unknown;
}

interface WorkflowDefinition {
  triggers: Array<{ type: string; inputs?: WorkflowInput[] }>;
  steps: WorkflowStep[];
}

const featuresIdentification = parse(FEATURES_IDENTIFICATION_YAML) as WorkflowDefinition;
const onboarding = parse(ONBOARDING_YAML) as WorkflowDefinition;

const flattenSteps = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.flatMap((step) => [step, ...(step.steps ? flattenSteps(step.steps) : [])]);

const findStep = (definition: WorkflowDefinition, name: string): WorkflowStep => {
  const step = flattenSteps(definition.steps).find((candidate) => candidate.name === name);
  if (!step) {
    throw new Error(`Missing workflow step ${name}`);
  }
  return step;
};

const findInput = (definition: WorkflowDefinition, name: string): WorkflowInput | undefined =>
  definition.triggers
    .flatMap((trigger) => trigger.inputs ?? [])
    .find((input) => input.name === name);

describe('Significant Events computed features timeout workflow contracts', () => {
  it('owns the default in the features identification workflow and sends it to the route', () => {
    expect(findInput(featuresIdentification, 'computedFeaturesTimeoutMs')).toEqual(
      expect.objectContaining({ type: 'number', default: 60000 })
    );
    expect(findStep(featuresIdentification, 'identify_computed').with?.body).toEqual(
      expect.objectContaining({
        computedFeaturesTimeoutMs: '${{ inputs.computedFeaturesTimeoutMs }}',
      })
    );
  });

  it('owns the default in the onboarding workflow and passes it to the features workflow', () => {
    expect(findInput(onboarding, 'featuresComputedTimeoutMs')).toEqual(
      expect.objectContaining({ type: 'number', default: 60000 })
    );
    expect(findStep(onboarding, 'identify_features').with?.inputs).toEqual(
      expect.objectContaining({
        computedFeaturesTimeoutMs: '${{ inputs.featuresComputedTimeoutMs }}',
      })
    );
  });
});
