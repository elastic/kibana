/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { HttpSetup } from '@kbn/core/public';
import type { GuideState, GuideId, GuideStepIds, StepStatus } from '@kbn/guided-onboarding';
import type { CloudStart } from '@kbn/cloud-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GuidedOnboardingPluginSetup {}

export interface GuidedOnboardingPluginStart {
  guidedOnboardingApi?: GuidedOnboardingApi;
}

export interface AppPluginStartDependencies {
  cloud?: CloudStart;
}

export interface GuidedOnboardingApi {
  setup: (httpClient: HttpSetup) => void;
  fetchActiveGuideState$: () => Observable<GuideState | undefined>;
  fetchAllGuidesState: () => Promise<{ state: GuideState[] } | undefined>;
  updateGuideState: (
    newState: GuideState,
    panelState: boolean
  ) => Promise<{ state: GuideState } | undefined>;
  activateGuide: (
    guideId: GuideId,
    guide?: GuideState
  ) => Promise<{ state: GuideState } | undefined>;
  completeGuide: (guideId: GuideId) => Promise<{ state: GuideState } | undefined>;
  isGuideStepActive$: (guideId: GuideId, stepId: GuideStepIds) => Observable<boolean>;
  startGuideStep: (
    guideId: GuideId,
    stepId: GuideStepIds
  ) => Promise<{ state: GuideState } | undefined>;
  completeGuideStep: (
    guideId: GuideId,
    stepId: GuideStepIds
  ) => Promise<{ state: GuideState } | undefined>;
  isGuidedOnboardingActiveForIntegration$: (integration?: string) => Observable<boolean>;
  completeGuidedOnboardingForIntegration: (
    integration?: string
  ) => Promise<{ state: GuideState } | undefined>;
  isGuidePanelOpen$: Observable<boolean>;
}

export interface StepConfig {
  id: GuideStepIds;
  title: string;
  description?: string;
  descriptionList?: string[];
  location?: {
    appID: string;
    path: string;
  };
  status?: StepStatus;
  integration?: string;
  manualCompletion?: {
    title: string;
    description: string;
    readyToCompleteOnNavigation?: boolean;
  };
}
export interface GuideConfig {
  title: string;
  description: string;
  guideName: string;
  docs?: {
    text: string;
    url: string;
  };
  completedGuideRedirectLocation?: {
    appID: string;
    path: string;
  };
  steps: StepConfig[];
}

export type GuidesConfig = {
  [key in GuideId]: GuideConfig;
};
