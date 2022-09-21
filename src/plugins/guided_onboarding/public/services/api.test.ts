/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { firstValueFrom, Subscription } from 'rxjs';

import { API_BASE_PATH } from '../../common';
import { ApiService } from './api';
import { GuidedOnboardingState } from '..';
import { guidesConfig } from '../constants/guides_config';

const searchGuide = 'search';
const firstStep = guidesConfig[searchGuide].steps[0].id;
const secondStep = guidesConfig[searchGuide].steps[1].id;
const lastStep = guidesConfig[searchGuide].steps[2].id;

describe('GuidedOnboarding ApiService', () => {
  let httpClient: jest.Mocked<HttpSetup>;
  let apiService: ApiService;
  let subscription: Subscription;

  beforeEach(() => {
    httpClient = httpServiceMock.createStartContract({ basePath: '/base/path' });
    httpClient.get.mockResolvedValue({
      state: { activeGuide: searchGuide, activeStep: firstStep },
    });
    apiService = new ApiService();
    apiService.setup(httpClient);
  });

  afterEach(() => {
    if (subscription) {
      subscription.unsubscribe();
    }
    jest.restoreAllMocks();
  });

  describe('fetchGuideState$', () => {
    it('sends a request to the get API', () => {
      subscription = apiService.fetchGuideState$().subscribe();
      expect(httpClient.get).toHaveBeenCalledTimes(1);
      expect(httpClient.get).toHaveBeenCalledWith(`${API_BASE_PATH}/state`);
    });

    it('broadcasts the updated state', async () => {
      await apiService.updateGuideState({
        activeGuide: searchGuide,
        activeStep: secondStep,
      });

      const state = await firstValueFrom(apiService.fetchGuideState$());
      expect(state).toEqual({ activeGuide: searchGuide, activeStep: secondStep });
    });
  });

  describe('updateGuideState', () => {
    it('sends a request to the put API', async () => {
      const state = {
        activeGuide: searchGuide,
        activeStep: secondStep,
      };
      await apiService.updateGuideState(state as GuidedOnboardingState);
      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify(state),
      });
    });
  });

  describe('isGuideStepActive$', () => {
    it('returns true if the step is active', async (done) => {
      subscription = apiService
        .isGuideStepActive$(searchGuide, firstStep)
        .subscribe((isStepActive) => {
          if (isStepActive) {
            done();
          }
        });
    });

    it('returns false if the step is not active', async (done) => {
      subscription = apiService
        .isGuideStepActive$(searchGuide, secondStep)
        .subscribe((isStepActive) => {
          if (!isStepActive) {
            done();
          }
        });
    });
  });

  describe('completeGuideStep', () => {
    it(`completes the step when it's active`, async () => {
      await apiService.completeGuideStep(searchGuide, firstStep);
      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // this assertion depends on the guides config, we are checking for the next step
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          activeGuide: searchGuide,
          activeStep: secondStep,
        }),
      });
    });

    it(`completes the guide when the last step is active`, async () => {
      httpClient.get.mockResolvedValue({
        // this state depends on the guides config
        state: { activeGuide: searchGuide, activeStep: lastStep },
      });
      apiService.setup(httpClient);

      await apiService.completeGuideStep(searchGuide, lastStep);
      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // this assertion depends on the guides config, we are checking for the last step
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          activeGuide: searchGuide,
          activeStep: 'completed',
        }),
      });
    });

    it(`does nothing if the step is not active`, async () => {
      await apiService.completeGuideStep(searchGuide, secondStep);
      expect(httpClient.put).not.toHaveBeenCalled();
    });
  });
});
