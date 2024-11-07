/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GuideState, GuideStepIds } from '@kbn/guided-onboarding';

import { PluginState } from '../../common';

export const testGuideFirstStep: GuideStepIds = 'step1';
export const testGuideManualCompletionStep = 'step2';
export const testGuideLastStep: GuideStepIds = 'step4';
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
    {
      id: 'step4',
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
    testGuideStep1ActiveState.steps[3],
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
    testGuideStep1ActiveState.steps[3],
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
    testGuideStep1ActiveState.steps[3],
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
    testGuideStep1ActiveState.steps[3],
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
    testGuideStep1ActiveState.steps[3],
  ],
};

export const testGuideStep4ActiveState: GuideState = {
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
      status: 'complete',
    },
    {
      id: testGuideStep1ActiveState.steps[3].id,
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
    {
      ...testGuideStep1ActiveState.steps[3],
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

export const testGuideParams = {
  param1: 'test1',
  param2: 'test2',
};
