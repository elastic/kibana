/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GuideId, GuideState, GuideStepIds } from '../../common/types';
import { guidesConfig } from '../constants/guides_config';
import { GuideConfig, StepConfig } from '../types';

export const getGuideConfig = (guideID?: string): GuideConfig | undefined => {
  if (guideID && Object.keys(guidesConfig).includes(guideID)) {
    return guidesConfig[guideID as GuideId];
  }
};

const getStepIndex = (guideID: string, stepID: string): number => {
  const guide = getGuideConfig(guideID);
  if (guide) {
    return guide.steps.findIndex((step: StepConfig) => step.id === stepID);
  }
  return -1;
};

export const isLastStep = (guideID: string, stepID: string): boolean => {
  const guide = getGuideConfig(guideID);
  const activeStepIndex = getStepIndex(guideID, stepID);
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

export const isIntegrationInGuideStep = (state: GuideState, integration?: string): boolean => {
  if (state.isActive) {
    const stepConfig = getInProgressStepConfig(state);
    return stepConfig ? stepConfig.integration === integration : false;
  }
  return false;
};
