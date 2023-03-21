/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GuideState, GuideStepIds } from '@kbn/guided-onboarding';

import { PluginState } from '../../common';

export const testGuideFirstStep: GuideStepIds = 'step1';
export const testGuideManualCompletionStep = 'step2';
export const testGuideLastStep: GuideStepIds = 'step3';
export const testIntegration = 'testIntegration';
export const wrongIntegration = 'notTestIntegration';

export const testGuideStep1ActiveState: GuideState = {
  guideId: 'testGuide',
  isActive: true,
  status: 'in_progress',
  steps: [
    {
      id: 'step1',
      status: 'active',
    },
    {
      id: 'step2',
      status: 'inactive',
    },
    {
      id: 'step3',
      status: 'inactive',
    },
  ],
};

export const testGuideStep1InProgressState: GuideState = {
  ...testGuideStep1ActiveState,
  steps: [
    {
      id: testGuideStep1ActiveState.steps[0].id,
      status: 'in_progress', // update the first step status
    },
    testGuideStep1ActiveState.steps[1],
    testGuideStep1ActiveState.steps[2],
  ],
};

export const testGuideStep2ActiveState: GuideState = {
  ...testGuideStep1ActiveState,
  steps: [
    {
      ...testGuideStep1ActiveState.steps[0],
      status: 'complete',
    },
    {
      id: testGuideStep1ActiveState.steps[1].id,
      status: 'active',
    },
    testGuideStep1ActiveState.steps[2],
  ],
};

export const testGuideStep2InProgressState: GuideState = {
  ...testGuideStep1ActiveState,
  steps: [
    {
      ...testGuideStep1ActiveState.steps[0],
      status: 'complete',
    },
    {
      id: testGuideStep1ActiveState.steps[1].id,
      status: 'in_progress',
    },
    testGuideStep1ActiveState.steps[2],
  ],
};

export const testGuideStep2ReadyToCompleteState: GuideState = {
  ...testGuideStep1ActiveState,
  steps: [
    {
      ...testGuideStep1ActiveState.steps[0],
      status: 'complete',
    },
    {
      ...testGuideStep1ActiveState.steps[1],
      status: 'ready_to_complete',
    },
    testGuideStep1ActiveState.steps[2],
  ],
};

export const testGuideStep3ActiveState: GuideState = {
  ...testGuideStep1ActiveState,
  steps: [
    {
      ...testGuideStep1ActiveState.steps[0],
      status: 'complete',
    },
    {
      id: testGuideStep1ActiveState.steps[1].id,
      status: 'complete',
    },
    {
      id: testGuideStep1ActiveState.steps[2].id,
      status: 'active',
    },
  ],
};

export const readyToCompleteGuideState: GuideState = {
  ...testGuideStep1ActiveState,
  steps: [
    {
      ...testGuideStep1ActiveState.steps[0],
      status: 'complete',
    },
    {
      ...testGuideStep1ActiveState.steps[1],
      status: 'complete',
    },
    {
      ...testGuideStep1ActiveState.steps[2],
      status: 'complete',
    },
  ],
};

export const testGuideNotActiveState: GuideState = {
  ...testGuideStep1ActiveState,
  isActive: false,
};

export const mockPluginStateNotStarted: PluginState = {
  status: 'not_started',
  isActivePeriod: true,
};

export const mockPluginStateInProgress: PluginState = {
  status: 'in_progress',
  isActivePeriod: true,
  activeGuide: testGuideStep1ActiveState,
};
