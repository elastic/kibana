/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { GuidedOnboardingPluginStart } from '.';

const apiServiceMock: jest.Mocked<GuidedOnboardingPluginStart> = {
  guidedOnboardingApi: {
    setup: jest.fn(),
    fetchPluginState$: () => new BehaviorSubject(undefined),
    fetchAllGuidesState: jest.fn(),
    updatePluginState: jest.fn(),
    activateGuide: jest.fn(),
    deactivateGuide: jest.fn(),
    completeGuide: jest.fn(),
    isGuideStepActive$: () => new BehaviorSubject(false),
    isGuideStepReadyToComplete$: () => new BehaviorSubject(false),
    startGuideStep: jest.fn(),
    completeGuideStep: jest.fn(),
    isGuidedOnboardingActiveForIntegration$: () => new BehaviorSubject(false),
    completeGuidedOnboardingForIntegration: jest.fn(),
    skipGuidedOnboarding: jest.fn(),
    isGuidePanelOpen$: new BehaviorSubject(false),
    isLoading$: new BehaviorSubject(false),
    getGuideConfig: jest.fn(),
    isEnabled: true,
  },
};

export const guidedOnboardingMock = {
  createSetup: () => {},
  createStart: () => apiServiceMock,
};
