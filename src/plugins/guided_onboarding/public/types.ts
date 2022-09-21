/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { UseCase } from '../common/types';
import { ApiService } from './services/api';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GuidedOnboardingPluginSetup {}

export interface GuidedOnboardingPluginStart {
  guidedOnboardingApi?: ApiService;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
export interface GuidedOnboardingState {
  activeGuide: UseCase | 'unset';
  activeStep: string | 'unset' | 'completed';
}

export interface ClientConfigType {
  ui: boolean;
}
