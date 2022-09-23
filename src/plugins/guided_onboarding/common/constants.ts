/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { guidesConfig } from './guides_config';
import { UseCase } from './types';

export const PLUGIN_ID = 'guidedOnboarding';
export const PLUGIN_NAME = 'guidedOnboarding';

export const API_BASE_PATH = '/api/guided_onboarding';

export const getDefaultStepsStatus = (guide: UseCase) => {
  const guideSteps = guidesConfig[guide].steps;

  return guideSteps.map((step) => {
    return {
      id: step.id,
      status: 'inactive',
    };
  });
};

export const guidedSetupDefaultState = {
  search: {
    status: 'inactive',
    steps: getDefaultStepsStatus('search'),
  },
  observability: {
    status: 'inactive',
    steps: getDefaultStepsStatus('observability'),
  },
  security: {
    status: 'inactive',
    steps: getDefaultStepsStatus('security'),
  },
};
