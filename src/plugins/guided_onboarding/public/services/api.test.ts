/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { GuideState } from '@kbn/guided-onboarding';
import { firstValueFrom, Subscription } from 'rxjs';

import { API_BASE_PATH } from '../../common/constants';
import { ApiService } from './api';
import {
  testGuide,
  testGuideFirstStep,
  testGuideManualCompletionStep,
  testGuideStep1ActiveState,
  testGuideStep1InProgressState,
  testGuideStep2ActiveState,
  testGuideNotActiveState,
  testIntegration,
  wrongIntegration,
  testGuideStep2InProgressState,
} from './api.mocks';

describe('GuidedOnboarding ApiService', () => {
  let httpClient: jest.Mocked<HttpSetup>;
  let apiService: ApiService;
  let subscription: Subscription;

  beforeEach(() => {
    httpClient = httpServiceMock.createStartContract({ basePath: '/base/path' });
    httpClient.get.mockResolvedValue({
      state: [testGuideStep1ActiveState],
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

  describe('fetchActiveGuideState$', () => {
    it('sends a request to the get API', () => {
      subscription = apiService.fetchActiveGuideState$().subscribe();
      expect(httpClient.get).toHaveBeenCalledTimes(1);
      expect(httpClient.get).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        query: { active: true },
      });
    });

    it('broadcasts the updated state', async () => {
      await apiService.activateGuide(testGuide, testGuideStep1ActiveState);

      const state = await firstValueFrom(apiService.fetchActiveGuideState$());
      expect(state).toEqual(testGuideStep1ActiveState);
    });
  });

  describe('fetchAllGuidesState', () => {
    it('sends a request to the get API', async () => {
      await apiService.fetchAllGuidesState();
      expect(httpClient.get).toHaveBeenCalledTimes(1);
      expect(httpClient.get).toHaveBeenCalledWith(`${API_BASE_PATH}/state`);
    });
  });

  describe('deactivateGuide', () => {
    it('deactivates an existing guide', async () => {
      await apiService.deactivateGuide(testGuideStep1ActiveState);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          ...testGuideStep1ActiveState,
          isActive: false,
        }),
      });
    });
  });

  describe('updateGuideState', () => {
    it('sends a request to the put API', async () => {
      const updatedState: GuideState = testGuideStep1InProgressState;
      await apiService.updateGuideState(updatedState, false);
      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify(updatedState),
      });
    });
  });

  describe('isGuideStepActive$', () => {
    it('returns true if the step has been started', async (done) => {
      const updatedState: GuideState = testGuideStep1InProgressState;
      await apiService.updateGuideState(updatedState, false);

      subscription = apiService
        .isGuideStepActive$(testGuide, testGuideFirstStep)
        .subscribe((isStepActive) => {
          if (isStepActive) {
            done();
          }
        });
    });

    it('returns false if the step is not been started', async (done) => {
      subscription = apiService
        .isGuideStepActive$(testGuide, testGuideFirstStep)
        .subscribe((isStepActive) => {
          if (!isStepActive) {
            done();
          }
        });
    });
  });

  describe('activateGuide', () => {
    it('activates a new guide', async () => {
      // update the mock to no active guides
      httpClient.get.mockResolvedValue({
        state: [],
      });
      apiService.setup(httpClient);

      await apiService.activateGuide(testGuide);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({ ...testGuideStep1ActiveState, status: 'not_started' }),
      });
    });

    it('reactivates a guide that has already been started', async () => {
      await apiService.activateGuide(testGuide, testGuideStep1ActiveState);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify(testGuideStep1ActiveState),
      });
    });
  });

  describe('completeGuide', () => {
    const readyToCompleteGuideState: GuideState = {
      ...testGuideStep1ActiveState,
      steps: [
        {
          ...testGuideStep1ActiveState.steps[0],
          status: 'complete',
        },
        {
          ...testGuideStep1ActiveState.steps[1],
          status: 'complete',
        },
        {
          ...testGuideStep1ActiveState.steps[2],
          status: 'complete',
        },
      ],
    };

    beforeEach(async () => {
      await apiService.updateGuideState(readyToCompleteGuideState, false);
    });

    it('updates the selected guide and marks it as complete', async () => {
      await apiService.completeGuide(testGuide);

      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          ...readyToCompleteGuideState,
          isActive: false,
          status: 'complete',
        }),
      });
    });

    it('returns undefined if the selected guide is not active', async () => {
      const completedState = await apiService.completeGuide('observability'); // not active
      expect(completedState).not.toBeDefined();
    });

    it('returns undefined if the selected guide has uncompleted steps', async () => {
      const incompleteGuideState: GuideState = {
        ...testGuideStep1ActiveState,
        steps: [
          {
            ...testGuideStep1ActiveState.steps[0],
            status: 'complete',
          },
          {
            ...testGuideStep1ActiveState.steps[1],
            status: 'complete',
          },
          {
            ...testGuideStep1ActiveState.steps[2],
            status: 'in_progress',
          },
        ],
      };
      await apiService.updateGuideState(incompleteGuideState, false);

      const completedState = await apiService.completeGuide(testGuide);
      expect(completedState).not.toBeDefined();
    });
  });

  describe('startGuideStep', () => {
    beforeEach(async () => {
      await apiService.updateGuideState(testGuideStep1ActiveState, false);
    });

    it('updates the selected step and marks it as in_progress', async () => {
      await apiService.startGuideStep(testGuide, testGuideFirstStep);

      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify(testGuideStep1InProgressState),
      });
    });

    it('returns undefined if the selected guide is not active', async () => {
      const startState = await apiService.startGuideStep('observability', 'add_data'); // not active
      expect(startState).not.toBeDefined();
    });
  });

  describe('completeGuideStep', () => {
    it(`completes the step when it's in progress`, async () => {
      await apiService.updateGuideState(testGuideStep1InProgressState, false);

      await apiService.completeGuideStep(testGuide, testGuideFirstStep);

      // Once on update, once on complete
      expect(httpClient.put).toHaveBeenCalledTimes(2);
      // Verify the completed step now has a "complete" status, and the subsequent step is "active"
      expect(httpClient.put).toHaveBeenLastCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({ ...testGuideStep2ActiveState }),
      });
    });

    it(`marks the step as 'ready_to_complete' if it's configured for manual completion`, async () => {
      httpClient.get.mockResolvedValue({
        state: [testGuideStep2InProgressState],
      });
      apiService.setup(httpClient);

      await apiService.completeGuideStep(testGuide, testGuideManualCompletionStep);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // Verify the completed step now has a "ready_to_complete" status, and the subsequent step is "inactive"
      expect(httpClient.put).toHaveBeenLastCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          ...testGuideStep2InProgressState,
          steps: [
            testGuideStep2InProgressState.steps[0],
            { ...testGuideStep2InProgressState.steps[1], status: 'ready_to_complete' },
            testGuideStep2InProgressState.steps[2],
          ],
        }),
      });
    });

    it('returns undefined if the selected guide is not active', async () => {
      const startState = await apiService.completeGuideStep('observability', 'add_data'); // not active
      expect(startState).not.toBeDefined();
    });

    it('does nothing if the step is not in progress', async () => {
      // by default the state set in beforeEach is test guide, step 1 active
      await apiService.completeGuideStep(testGuide, testGuideFirstStep);
      expect(httpClient.put).toHaveBeenCalledTimes(0);
    });
  });

  describe('isGuidedOnboardingActiveForIntegration$', () => {
    it('returns true if the integration is part of the active step', async (done) => {
      httpClient.get.mockResolvedValue({
        state: [testGuideStep1InProgressState],
      });
      apiService.setup(httpClient);
      subscription = apiService
        .isGuidedOnboardingActiveForIntegration$(testIntegration)
        .subscribe((isIntegrationInGuideStep) => {
          if (isIntegrationInGuideStep) {
            done();
          }
        });
    });

    it('returns false if the current step has a different integration', async (done) => {
      httpClient.get.mockResolvedValue({
        state: [testGuideStep1InProgressState],
      });
      apiService.setup(httpClient);
      subscription = apiService
        .isGuidedOnboardingActiveForIntegration$(wrongIntegration)
        .subscribe((isIntegrationInGuideStep) => {
          if (!isIntegrationInGuideStep) {
            done();
          }
        });
    });

    it('returns false if no guide is active', async (done) => {
      httpClient.get.mockResolvedValue({
        state: [testGuideNotActiveState],
      });
      apiService.setup(httpClient);
      subscription = apiService
        .isGuidedOnboardingActiveForIntegration$(testIntegration)
        .subscribe((isIntegrationInGuideStep) => {
          if (!isIntegrationInGuideStep) {
            done();
          }
        });
    });
  });

  describe('completeGuidedOnboardingForIntegration', () => {
    it(`completes the step if it's active for the integration`, async () => {
      httpClient.get.mockResolvedValue({
        state: [testGuideStep1InProgressState],
      });
      apiService.setup(httpClient);

      await apiService.completeGuidedOnboardingForIntegration(testIntegration);
      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // this assertion depends on the guides config
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify(testGuideStep2ActiveState),
      });
    });

    it(`does nothing if the step has a different integration`, async () => {
      httpClient.get.mockResolvedValue({
        state: [testGuideStep1InProgressState],
      });
      apiService.setup(httpClient);

      await apiService.completeGuidedOnboardingForIntegration(wrongIntegration);
      expect(httpClient.put).not.toHaveBeenCalled();
    });

    it(`does nothing if no guide is active`, async () => {
      httpClient.get.mockResolvedValue({
        state: [testGuideNotActiveState],
      });
      apiService.setup(httpClient);

      await apiService.completeGuidedOnboardingForIntegration(testIntegration);
      expect(httpClient.put).not.toHaveBeenCalled();
    });
  });
});
