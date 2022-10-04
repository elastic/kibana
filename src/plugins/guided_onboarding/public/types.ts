/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { HttpSetup } from '@kbn/core/public';
import { GuideId, GuideStepIds, StepStatus } from '../common/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GuidedOnboardingPluginSetup {}

export interface GuidedOnboardingPluginStart {
  guidedOnboardingApi?: GuidedOnboardingApi;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

export interface ClientConfigType {
  ui: boolean;
}
export interface GuidedOnboardingApi {
  setup: (httpClient: HttpSetup) => void;
  fetchGuideState$: () => Observable<GuidedOnboardingState>;
  updateGuideState: (
    newState: GuidedOnboardingState
  ) => Promise<{ state: GuidedOnboardingState } | undefined>;
  isGuideStepActive$: (guideID: string, stepID: string) => Observable<boolean>;
  completeGuideStep: (
    guideID: string,
    stepID: string
  ) => Promise<{ state: GuidedOnboardingState } | undefined>;
  isGuidedOnboardingActiveForIntegration$: (integration?: string) => Observable<boolean>;
  completeGuidedOnboardingForIntegration: (
    integration?: string
  ) => Promise<{ state: GuidedOnboardingState } | undefined>;
}

export type UseCase = 'observability' | 'security' | 'search';
export type StepStatus = 'incomplete' | 'complete' | 'in_progress';

export interface StepConfig {
  id: GuideStepIds;
  title: string;
  descriptionList: string[];
  location?: {
    appID: string;
    path: string;
  };
  status?: StepStatus;
  integration?: string;
}
export interface GuideConfig {
  title: string;
  description: string;
  docs?: {
    text: string;
    url: string;
  };
  steps: StepConfig[];
}

export type GuidesConfig = {
  [key in GuideId]: GuideConfig;
};
