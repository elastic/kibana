/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import { HttpSetup } from '@kbn/core/public';
import type {
  GuideState,
  GuideId,
  GuideStepIds,
  GuideConfig,
  GuideParams,
} from '@kbn/guided-onboarding';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { PluginStatus, PluginState } from '../common';

export interface GuidedOnboardingPluginSetup {
  cloud: CloudSetup;
}

export interface GuidedOnboardingPluginStart {
  guidedOnboardingApi?: GuidedOnboardingApi;
}

export interface AppPluginStartDependencies {
  cloud: CloudStart;
}

export interface GuidedOnboardingApi {
  setup: (httpClient: HttpSetup, isCloudEnabled: boolean) => void;
  fetchPluginState$: () => Observable<PluginState | undefined>;
  fetchAllGuidesState: () => Promise<{ state: GuideState[] } | undefined>;
  updatePluginState: (
    state: { status?: PluginStatus; guide?: GuideState },
    panelState: boolean
  ) => Promise<{ pluginState: PluginState } | undefined>;
  activateGuide: (
    guideId: GuideId,
    guide?: GuideState
  ) => Promise<{ pluginState: PluginState } | undefined>;
  deactivateGuide: (guide: GuideState) => Promise<{ pluginState: PluginState } | undefined>;
  completeGuide: (guideId: GuideId) => Promise<{ pluginState: PluginState } | undefined>;
  isGuideStepActive$: (guideId: GuideId, stepId: GuideStepIds) => Observable<boolean>;
  isGuideStepReadyToComplete$: (guideId: GuideId, stepId: GuideStepIds) => Observable<boolean>;
  startGuideStep: (
    guideId: GuideId,
    stepId: GuideStepIds
  ) => Promise<{ pluginState: PluginState } | undefined>;
  completeGuideStep: (
    guideId: GuideId,
    stepId: GuideStepIds,
    params?: GuideParams
  ) => Promise<{ pluginState: PluginState } | undefined>;
  isGuidedOnboardingActiveForIntegration$: (integration?: string) => Observable<boolean>;
  completeGuidedOnboardingForIntegration: (
    integration?: string
  ) => Promise<{ pluginState: PluginState } | undefined>;
  skipGuidedOnboarding: () => Promise<{ pluginState: PluginState } | undefined>;
  isGuidePanelOpen$: Observable<boolean>;
  isLoading$: Observable<boolean>;
  getGuideConfig: (guideId: GuideId) => Promise<GuideConfig | undefined>;
  readonly isEnabled: boolean;
}
