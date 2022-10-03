/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { GuideId, GuideStepIds, StepStatus } from '../common/types';
import { ApiService } from './services/api';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GuidedOnboardingPluginSetup {}

export interface GuidedOnboardingPluginStart {
  guidedOnboardingApi?: ApiService;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

export interface ClientConfigType {
  ui: boolean;
}

export interface StepConfig {
  id: GuideStepIds;
  title: string;
  descriptionList: string[];
  location?: {
    appID: string;
    path: string;
  };
  status?: StepStatus;
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
