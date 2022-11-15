/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  GuideId,
  GuideStepIds,
  GuideState,
  GuideStep,
  GuideStatus,
} from '@kbn/guided-onboarding';
import { guidesConfig } from '../constants/guides_config';
import { GuideConfig, StepConfig } from '../types';
import type { PluginState } from '../../common/types';

export const getGuideConfig = (guideId?: GuideId): GuideConfig | undefined => {
  if (guideId && Object.keys(guidesConfig).includes(guideId)) {
    return guidesConfig[guideId];
  }
};

export const getStepConfig = (guideId: GuideId, stepId: GuideStepIds): StepConfig | undefined => {
  const guideConfig = getGuideConfig(guideId);
  return guideConfig?.steps.find((step) => step.id === stepId);
};

const getStepIndex = (guideId: GuideId, stepId: GuideStepIds): number => {
  const guide = getGuideConfig(guideId);
  if (guide) {
    return guide.steps.findIndex((step: StepConfig) => step.id === stepId);
  }
  return -1;
};

export const isLastStep = (guideId: GuideId, stepId: GuideStepIds): boolean => {
  const guide = getGuideConfig(guideId);
  const activeStepIndex = getStepIndex(guideId, stepId);
  const stepsNumber = guide?.steps.length || 0;
  if (stepsNumber > 0) {
    return activeStepIndex === stepsNumber - 1;
  }
  return false;
};

export const getInProgressStepId = (state: GuideState): GuideStepIds | undefined => {
  const inProgressStep = state.steps.find((step) => step.status === 'in_progress');
  return inProgressStep ? inProgressStep.id : undefined;
};

const getInProgressStepConfig = (state: GuideState): StepConfig | undefined => {
  const inProgressStepId = getInProgressStepId(state);
  if (inProgressStepId) {
    const config = getGuideConfig(state.guideId);
    if (config) {
      return config.steps.find((step) => step.id === inProgressStepId);
    }
  }
};

export const isIntegrationInGuideStep = (
  guideState?: GuideState,
  integration?: string
): boolean => {
  if (!guideState || !guideState.isActive) return false;

  const stepConfig = getInProgressStepConfig(guideState);
  return stepConfig ? stepConfig.integration === integration : false;
};

export const isGuideActive = (pluginState?: PluginState, guideId?: GuideId): boolean => {
  // false if pluginState is undefined or plugin state is not in progress
  // or active guide is undefined
  if (!pluginState || pluginState.status !== 'in_progress' || !pluginState.activeGuide) {
    return false;
  }
  // guideId is passed, check that it's the id of the active guide
  if (guideId) {
    const { activeGuide } = pluginState;
    return !!(activeGuide.isActive && activeGuide.guideId === guideId);
  }
  return true;
};

export const isStepInProgress = (
  guideState: GuideState | undefined,
  guideId: GuideId,
  stepId: GuideStepIds
): boolean => {
  if (!guideState || !guideState.isActive) return false;

  // false if the step is not 'in_progress'
  const selectedStep = guideState.steps.find((step) => step.id === stepId);
  return selectedStep ? selectedStep.status === 'in_progress' : false;
};

export const isStepReadyToComplete = (
  guideState: GuideState | undefined,
  guideId: GuideId,
  stepId: GuideStepIds
): boolean => {
  if (!guideState || !guideState.isActive) return false;
  // false if the step is not 'ready_to_complete'
  const selectedStep = guideState!.steps.find((step) => step.id === stepId);
  return selectedStep ? selectedStep.status === 'ready_to_complete' : false;
};

export const getUpdatedSteps = (
  guideState: GuideState,
  stepId: GuideStepIds,
  setToReadyToComplete?: boolean
): GuideStep[] => {
  const currentStepIndex = guideState.steps.findIndex((step) => step.id === stepId);
  const currentStep = guideState.steps[currentStepIndex];
  return guideState.steps.map((step, stepIndex) => {
    const isCurrentStep = step.id === currentStep!.id;
    const isNextStep = stepIndex === currentStepIndex + 1;

    if (isCurrentStep) {
      return {
        id: step.id,
        status: setToReadyToComplete ? 'ready_to_complete' : 'complete',
      };
    }

    // if the current step is being updated to 'ready_to_complete, the next step stays inactive
    // otherwise update the next step to active status
    if (isNextStep) {
      return setToReadyToComplete
        ? step
        : {
            id: step.id,
            status: 'active',
          };
    }

    // All other steps return as-is
    return step;
  });
};

export const getGuideStatusOnStepCompletion = (
  guideState: GuideState | undefined,
  guideId: GuideId,
  stepId: GuideStepIds
): GuideStatus => {
  const stepConfig = getStepConfig(guideId, stepId);
  const isManualCompletion = stepConfig?.manualCompletion || false;
  const isLastStepInGuide = isLastStep(guideId, stepId);
  const isCurrentStepReadyToComplete = isStepReadyToComplete(guideState, guideId, stepId);

  // We want to set the guide status to 'ready_to_complete' if the current step is the last step in the guide
  // and the step is not configured for manual completion
  // or if the current step is configured for manual completion and the last step is ready to complete
  if (
    (isLastStepInGuide && !isManualCompletion) ||
    (isLastStepInGuide && isManualCompletion && isCurrentStepReadyToComplete)
  ) {
    return 'ready_to_complete';
  }

  // Otherwise the guide is still in progress
  return 'in_progress';
};
