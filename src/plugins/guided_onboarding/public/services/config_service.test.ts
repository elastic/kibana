/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { GuideState } from '@kbn/guided-onboarding';
import { API_BASE_PATH, testGuideConfig } from '../../common/constants';
import {
  testGuide,
  testGuideFirstStep,
  testGuideLastStep,
  testGuideNotActiveState,
  testGuideStep1InProgressState,
  testGuideStep2InProgressState,
  testGuideStep3ActiveState,
  testIntegration,
  wrongIntegration,
} from './api.mocks';

import { ConfigService } from './config_service';

describe('GuidedOnboarding ConfigService', () => {
  let configService: ConfigService;
  let httpClient: jest.Mocked<HttpSetup>;

  beforeEach(() => {
    httpClient = httpServiceMock.createStartContract({ basePath: '/base/path' });
    httpClient.get.mockResolvedValue({
      configs: {
        testGuide: testGuideConfig,
      },
    });
    configService = new ConfigService();
    configService.setup(httpClient);
  });
  describe('getGuideConfig', () => {
    it('sends only one request to the get configs API', async () => {
      await configService.getGuideConfig(testGuide);
      await configService.getGuideConfig(testGuide);
      expect(httpClient.get).toHaveBeenCalledTimes(1);
      expect(httpClient.get).toHaveBeenCalledWith(`${API_BASE_PATH}/configs`);
    });

    it('returns undefined if the config is not found', async () => {
      httpClient.get.mockResolvedValueOnce({
        configs: {},
      });
      configService.setup(httpClient);
      const config = await configService.getGuideConfig(testGuide);
      expect(config).toBeUndefined();
    });

    it('returns the config for the guide', async () => {
      const config = await configService.getGuideConfig(testGuide);
      expect(config).toHaveProperty('title');
    });
  });

  describe('getStepConfig', () => {
    it('returns undefined if the config is not found', async () => {
      httpClient.get.mockResolvedValueOnce({
        configs: {},
      });
      configService.setup(httpClient);
      const config = await configService.getStepConfig(testGuide, testGuideFirstStep);
      expect(config).toBeUndefined();
    });

    it('returns the config for the step', async () => {
      const config = await configService.getStepConfig(testGuide, testGuideFirstStep);
      expect(config).toHaveProperty('title');
    });
  });

  describe('getGuideStatusOnStepCompletion', () => {
    it('returns in_progress when there is no guide state', async () => {
      const status = await configService.getGuideStatusOnStepCompletion(
        undefined,
        testGuide,
        testGuideFirstStep
      );
      expect(status).toBe('in_progress');
    });

    it('returns in_progress when completing not the last step', async () => {
      const status = await configService.getGuideStatusOnStepCompletion(
        testGuideStep1InProgressState,
        testGuide,
        testGuideFirstStep
      );
      expect(status).toBe('in_progress');
    });

    it('when completing the last step that is configured for manual completion, returns in_progress if the step is in progress', async () => {
      const testGuideStep3InProgressState: GuideState = {
        ...testGuideStep3ActiveState,
        steps: [
          testGuideStep3ActiveState.steps[0],
          testGuideStep3ActiveState.steps[1],
          { ...testGuideStep3ActiveState.steps[2], status: 'in_progress' },
        ],
      };
      const status = await configService.getGuideStatusOnStepCompletion(
        testGuideStep3InProgressState,
        testGuide,
        testGuideLastStep
      );
      expect(status).toBe('in_progress');
    });

    it('when completing the last step that is configured for manual completion, returns ready_to_complete if the step is ready_to_complete', async () => {
      const testGuideStep3InProgressState: GuideState = {
        ...testGuideStep3ActiveState,
        steps: [
          testGuideStep3ActiveState.steps[0],
          testGuideStep3ActiveState.steps[1],
          { ...testGuideStep3ActiveState.steps[2], status: 'ready_to_complete' },
        ],
      };
      const status = await configService.getGuideStatusOnStepCompletion(
        testGuideStep3InProgressState,
        testGuide,
        testGuideLastStep
      );
      expect(status).toBe('ready_to_complete');
    });
  });

  describe('isIntegrationInGuideStep', () => {
    it('return true if the integration is defined in the guide step config', async () => {
      const result = await configService.isIntegrationInGuideStep(
        testGuideStep1InProgressState,
        testIntegration
      );
      expect(result).toBe(true);
    });
    it('returns false if a different integration is defined in the guide step', async () => {
      const result = await configService.isIntegrationInGuideStep(
        testGuideStep1InProgressState,
        wrongIntegration
      );
      expect(result).toBe(false);
    });
    it('returns false if no integration is defined in the guide step', async () => {
      const result = await configService.isIntegrationInGuideStep(
        testGuideStep2InProgressState,
        testIntegration
      );
      expect(result).toBe(false);
    });
    it('returns false if no guide is active', async () => {
      const result = await configService.isIntegrationInGuideStep(
        testGuideNotActiveState,
        testIntegration
      );
      expect(result).toBe(false);
    });
    it('returns false if no integration passed', async () => {
      const result = await configService.isIntegrationInGuideStep(testGuideStep1InProgressState);
      expect(result).toBe(false);
    });
  });
});
