/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { GuideId, GuideState, GuideStatus, GuideConfig } from '@kbn/guided-onboarding';
import type { GuidesConfig } from '../../common';
import { API_BASE_PATH } from '../../common';
import { findGuideConfigByGuideId, getInProgressStepConfig } from './helpers';

type ConfigInitialization = {
  [key in GuideId]: boolean | undefined;
};
export class ConfigService {
  private client: HttpSetup | undefined;
  private configs: GuidesConfig | undefined;
  private isConfigInitialized: ConfigInitialization | undefined;

  setup(httpClient: HttpSetup) {
    this.client = httpClient;
    this.configs = {} as GuidesConfig;
    this.isConfigInitialized = {} as ConfigInitialization;
  }

  public async getGuideConfig(guideId: GuideId): Promise<GuideConfig | undefined> {
    if (!this.client) {
      throw new Error('ConfigService has not be initialized.');
    }
    // if not initialized yet, get the config from the backend
    if (!this.isConfigInitialized || !this.isConfigInitialized[guideId]) {
      try {
        const { config } = await this.client.get<{ config: GuideConfig }>(
          `${API_BASE_PATH}/configs/${guideId}`
        );
        if (!this.isConfigInitialized) this.isConfigInitialized = {} as ConfigInitialization;
        this.isConfigInitialized[guideId] = true;
        if (!this.configs) this.configs = {} as GuidesConfig;
        this.configs[guideId] = config;
      } catch (e) {
        // if there is an error, set the isInitialized property to avoid multiple requests
        if (!this.isConfigInitialized) this.isConfigInitialized = {} as ConfigInitialization;
        this.isConfigInitialized[guideId] = true;
      }
    }
    // get the config from the configs property
    return findGuideConfigByGuideId(this.configs, guideId);
  }

  public async getGuideStatusOnStepCompletion({
    isLastStepInGuide,
    isManualCompletion,
    isStepReadyToComplete,
  }: {
    isLastStepInGuide: boolean;
    isManualCompletion: boolean;
    isStepReadyToComplete: boolean;
  }): Promise<GuideStatus> {
    // We want to set the guide status to 'ready_to_complete' if the current step is the last step in the guide
    // and the step is not configured for manual completion
    // or if the current step is configured for manual completion and the last step is ready to complete
    if (
      (isLastStepInGuide && !isManualCompletion) ||
      (isLastStepInGuide && isManualCompletion && isStepReadyToComplete)
    ) {
      return 'ready_to_complete';
    }

    // Otherwise the guide is still in progress
    return 'in_progress';
  }

  public async isIntegrationInGuideStep(
    guideState?: GuideState,
    integration?: string
  ): Promise<boolean> {
    if (!guideState || !guideState.isActive) return false;

    const guideConfig = await this.getGuideConfig(guideState.guideId);
    const stepConfig = getInProgressStepConfig(guideConfig, guideState);
    return stepConfig ? stepConfig.integration === integration : false;
  }
}
