/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { GuideId, GuideState, GuideStatus, GuideStepIds } from '@kbn/guided-onboarding';
import { GuideConfig, GuidesConfig, StepConfig } from '../../common/types';
import { API_BASE_PATH } from '../../common/constants';
import {
  findGuideConfigByGuideId,
  isLastStep,
  isStepReadyToComplete,
  getInProgressStepConfig,
} from './helpers';

export class ConfigService {
  private client: HttpSetup | undefined;
  private configs: GuidesConfig | undefined;
  private isInitialized: boolean | undefined;

  setup(httpClient: HttpSetup) {
    this.client = httpClient;
    this.isInitialized = false;
  }

  public async getGuideConfig(guideId: GuideId): Promise<GuideConfig | undefined> {
    if (!this.client) {
      throw new Error('ConfigService has not be initialized.');
    }
    // if not initialized yet, get the configs from the backend
    if (!this.isInitialized) {
      try {
        const { configs } = await this.client.get<{ configs: GuidesConfig }>(
          `${API_BASE_PATH}/configs`
        );
        this.isInitialized = true;
        this.configs = configs;
      } catch (e) {
        // if there is an error, set the isInitialized property to avoid multiple requests
        this.isInitialized = true;
      }
    }
    // get the config from the configs property
    return findGuideConfigByGuideId(this.configs, guideId);
  }

  public async getStepConfig(
    guideId: GuideId,
    stepId: GuideStepIds
  ): Promise<StepConfig | undefined> {
    const guideConfig = await this.getGuideConfig(guideId);
    return guideConfig?.steps.find((step) => step.id === stepId);
  }

  public async getGuideStatusOnStepCompletion(
    guideState: GuideState | undefined,
    guideId: GuideId,
    stepId: GuideStepIds
  ): Promise<GuideStatus> {
    const stepConfig = await this.getStepConfig(guideId, stepId);
    const isManualCompletion = stepConfig?.manualCompletion || false;
    const guideConfig = await this.getGuideConfig(guideId);
    const isLastStepInGuide = isLastStep(guideConfig, guideId, stepId);
    const isCurrentStepReadyToComplete = isStepReadyToComplete(guideState, guideId, stepId);

    // We want to set the guide status to 'ready_to_complete' if the current step is the last step in the guide
    // and the step is not configured for manual completion
    // or if the current step is configured for manual completion and the last step is ready to complete
    if (
      (isLastStepInGuide && !isManualCompletion) ||
      (isLastStepInGuide && isManualCompletion && isCurrentStepReadyToComplete)
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
    console.log({ guideConfig });
    const stepConfig = getInProgressStepConfig(guideConfig, guideState);
    return stepConfig ? stepConfig.integration === integration : false;
  }
}
