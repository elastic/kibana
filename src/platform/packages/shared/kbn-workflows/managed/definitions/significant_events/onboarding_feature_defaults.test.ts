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

interface WorkflowInput {
  name: string;
  type: string;
  default?: unknown;
}

interface WorkflowStep {
  name: string;
  type: string;
  steps?: WorkflowStep[];
  with?: { inputs?: Record<string, unknown> };
}

interface WorkflowDefinition {
  triggers: Array<{ type: string; inputs?: WorkflowInput[] }>;
  steps: WorkflowStep[];
}

const featuresIdentification = parse(FEATURES_IDENTIFICATION_YAML) as WorkflowDefinition;
const onboarding = parse(ONBOARDING_YAML) as WorkflowDefinition;

// Each forwarded onboarding input, the child input it feeds, and the default that now lives only in the child.
const FORWARDED_FEATURE_INPUTS: ReadonlyArray<{
  parentInput: string;
  childInput: string;
  childDefault: unknown;
}> = [
  { parentInput: 'featuresMaxIterations', childInput: 'maxIterations', childDefault: 5 },
  {
    parentInput: 'featuresConvergencePatience',
    childInput: 'convergencePatience',
    childDefault: 2,
  },
  { parentInput: 'featuresSampleSize', childInput: 'sampleSize', childDefault: 20 },
  {
    parentInput: 'featuresEntityFilteredRatio',
    childInput: 'entityFilteredRatio',
    childDefault: 0.4,
  },
  { parentInput: 'featuresDiverseRatio', childInput: 'diverseRatio', childDefault: 0.4 },
  {
    parentInput: 'featuresMaxExcludedInPrompt',
    childInput: 'maxExcludedFeaturesInPrompt',
    childDefault: 10,
  },
  { parentInput: 'featuresMaxEntityFilters', childInput: 'maxEntityFilters', childDefault: 10 },
  {
    parentInput: 'featuresSamplingTimeoutMs',
    childInput: 'samplingTimeoutMs',
    childDefault: 60000,
  },
  {
    parentInput: 'featuresComputedTimeoutMs',
    childInput: 'computedFeaturesTimeoutMs',
    childDefault: 60000,
  },
];

const findInput = (definition: WorkflowDefinition, name: string): WorkflowInput | undefined =>
  definition.triggers
    .flatMap((trigger) => trigger.inputs ?? [])
    .find((input) => input.name === name);

const flattenSteps = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.flatMap((step) => [step, ...(step.steps ? flattenSteps(step.steps) : [])]);

const identifyFeaturesInputs = (): Record<string, unknown> => {
  const step = flattenSteps(onboarding.steps).find(
    (candidate) => candidate.name === 'identify_features'
  );
  if (!step?.with?.inputs) {
    throw new Error('Missing identify_features inputs in onboarding workflow');
  }
  return step.with.inputs;
};

describe('Significant Events onboarding forwards feature defaults from one owner', () => {
  it.each(FORWARDED_FEATURE_INPUTS)(
    'does not default $parentInput in onboarding and forwards it to $childInput',
    ({ parentInput, childInput, childDefault }) => {
      const parent = findInput(onboarding, parentInput);
      expect(parent).toBeDefined();
      expect(parent).not.toHaveProperty('default');

      expect(identifyFeaturesInputs()[childInput]).toBe(`\${{ inputs.${parentInput} }}`);

      expect(findInput(featuresIdentification, childInput)).toEqual(
        expect.objectContaining({ default: childDefault })
      );
    }
  );

  it('forwards only the inputs covered by this contract', () => {
    const forwardedChildInputs = Object.keys(identifyFeaturesInputs()).filter((key) =>
      FORWARDED_FEATURE_INPUTS.some(({ childInput }) => childInput === key)
    );
    expect(forwardedChildInputs).toHaveLength(FORWARDED_FEATURE_INPUTS.length);
  });
});
