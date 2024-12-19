/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { testGuideConfig, testGuideId } from '@kbn/guided-onboarding';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { API_BASE_PATH } from '../../common';
import {
  testGuideNotActiveState,
  testGuideStep1InProgressState,
  testGuideStep2InProgressState,
  testIntegration,
  wrongIntegration,
} from './api.mocks';

import { ConfigService } from './config.service';

describe('GuidedOnboarding ConfigService', () => {
  let configService: ConfigService;
  let httpClient: jest.Mocked<HttpSetup>;

  beforeEach(() => {
    httpClient = httpServiceMock.createStartContract({ basePath: '/base/path' });
    httpClient.get.mockResolvedValue({
      config: testGuideConfig,
    });
    configService = new ConfigService();
    configService.setup(httpClient);
  });
  describe('getGuideConfig', () => {
    it('sends only one request to the get configs API', async () => {
      await configService.getGuideConfig(testGuideId);
      await configService.getGuideConfig(testGuideId);
      expect(httpClient.get).toHaveBeenCalledTimes(1);
      expect(httpClient.get).toHaveBeenCalledWith(`${API_BASE_PATH}/configs/${testGuideId}`);
    });

    it('returns undefined if the config is not found', async () => {
      httpClient.get.mockRejectedValueOnce(new Error('Not found'));
      configService.setup(httpClient);
      const config = await configService.getGuideConfig(testGuideId);
      expect(config).toBeUndefined();
    });

    it('returns the config for the guide', async () => {
      const config = await configService.getGuideConfig(testGuideId);
      expect(config).toHaveProperty('title');
    });
  });

  describe('getGuideStatusOnStepCompletion', () => {
    it('returns in_progress when completing not the last step', async () => {
      const status = await configService.getGuideStatusOnStepCompletion({
        isLastStepInGuide: false,
        isManualCompletion: true,
        isStepReadyToComplete: true,
      });
      expect(status).toBe('in_progress');
    });

    it('when completing the last step that is configured for manual completion, returns in_progress if the step is in progress', async () => {
      const status = await configService.getGuideStatusOnStepCompletion({
        isLastStepInGuide: true,
        isManualCompletion: true,
        isStepReadyToComplete: false,
      });
      expect(status).toBe('in_progress');
    });

    it('when completing the last step that is configured for manual completion, returns ready_to_complete if the step is ready_to_complete', async () => {
      const status = await configService.getGuideStatusOnStepCompletion({
        isLastStepInGuide: true,
        isManualCompletion: true,
        isStepReadyToComplete: true,
      });
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
