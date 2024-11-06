/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  GuideId,
  GuideStepIds,
  GuideState,
  GuideStep,
  StepStatus,
  GuideConfig,
  StepConfig,
} from '@kbn/guided-onboarding';
import type { GuidesConfig, PluginState } from '../../common';

export const findGuideConfigByGuideId = (
  guidesConfig?: GuidesConfig,
  guideId?: GuideId
): GuideConfig | undefined => {
  if (guidesConfig && guideId && Object.keys(guidesConfig).includes(guideId)) {
    return guidesConfig[guideId];
  }
};

export const getStepConfig = (
  guideConfig: GuideConfig | undefined,
  guideId: GuideId,
  stepId: GuideStepIds
): StepConfig | undefined => {
  return guideConfig?.steps.find((step) => step.id === stepId);
};

const getStepIndex = (
  guideConfig: GuideConfig | undefined,
  guideId: GuideId,
  stepId: GuideStepIds
): number => {
  if (guideConfig) {
    return guideConfig.steps.findIndex((step: StepConfig) => step.id === stepId);
  }
  return -1;
};

export const isLastStep = (
  guideConfig: GuideConfig | undefined,
  guideId: GuideId,
  stepId: GuideStepIds
): boolean => {
  const activeStepIndex = getStepIndex(guideConfig, guideId, stepId);
  const stepsNumber = guideConfig?.steps.length || 0;
  if (stepsNumber > 0) {
    return activeStepIndex === stepsNumber - 1;
  }
  return false;
};

export const getInProgressStepId = (state: GuideState): GuideStepIds | undefined => {
  const inProgressStep = state.steps.find((step) => step.status === 'in_progress');
  return inProgressStep ? inProgressStep.id : undefined;
};

export const getInProgressStepConfig = (
  guideConfig: GuideConfig | undefined,
  state: GuideState
): StepConfig | undefined => {
  const inProgressStepId = getInProgressStepId(state);
  if (inProgressStepId) {
    if (guideConfig) {
      return guideConfig.steps.find((step) => step.id === inProgressStepId);
    }
  }
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

const isStepStatus = (
  guideState: GuideState | undefined,
  status: StepStatus,
  guideId: GuideId,
  stepId: GuideStepIds
): boolean => {
  if (!guideState || !guideState.isActive || guideState.guideId !== guideId) return false;

  // false if the step is not 'in_progress'
  const selectedStep = guideState.steps.find((step) => step.id === stepId);
  return selectedStep ? selectedStep.status === status : false;
};
export const isStepInProgress = (
  guideState: GuideState | undefined,
  guideId: GuideId,
  stepId: GuideStepIds
): boolean => {
  return isStepStatus(guideState, 'in_progress', guideId, stepId);
};

export const isStepReadyToComplete = (
  guideState: GuideState | undefined,
  guideId: GuideId,
  stepId: GuideStepIds
): boolean => {
  return isStepStatus(guideState, 'ready_to_complete', guideId, stepId);
};

export const getCompletedSteps = (
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
