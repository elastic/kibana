/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GuideId } from '../../common/types';
import { guidesConfig } from '../constants/guides_config';
import type { GuideConfig, StepConfig } from '../types';

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
