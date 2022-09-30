/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { GuidedOnboardingPluginStart } from '.';

const apiServiceMock: jest.Mocked<GuidedOnboardingPluginStart> = {
  guidedOnboardingApi: {
    isGuidedOnboardingActiveForIntegration$: () => new BehaviorSubject(false),
    completeGuidedOnboardingForIntegration: jest.fn(),
    isGuideStepActive$: () => new BehaviorSubject(false),
    completeGuideStep: jest.fn(),
    fetchGuideState$: jest.fn(),
    updateGuideState: jest.fn(),
    setup: jest.fn(),
  },
};

export const guidedOnboardingMock = {
  createSetup: () => {},
  createStart: () => apiServiceMock,
};
