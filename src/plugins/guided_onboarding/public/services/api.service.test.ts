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
import { testGuideConfig, testGuideId } from '@kbn/guided-onboarding';
import { firstValueFrom, Subscription } from 'rxjs';

import { API_BASE_PATH } from '../../common';
import { ApiService } from './api.service';
import {
  testGuideFirstStep,
  testGuideLastStep,
  testGuideManualCompletionStep,
  testGuideStep1ActiveState,
  testGuideStep1InProgressState,
  testGuideStep2ActiveState,
  testGuideNotActiveState,
  testIntegration,
  wrongIntegration,
  testGuideStep2InProgressState,
  readyToCompleteGuideState,
  mockPluginStateInProgress,
  mockPluginStateNotStarted,
  testGuideStep3ActiveState,
  testGuideStep2ReadyToCompleteState,
} from './api.mocks';

describe('GuidedOnboarding ApiService', () => {
  let httpClient: jest.Mocked<HttpSetup>;
  let apiService: ApiService;
  let subscription: Subscription;
  let anotherSubscription: Subscription;

  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });
  beforeEach(() => {
    httpClient = httpServiceMock.createStartContract({ basePath: '/base/path' });
    httpClient.get.mockResolvedValue({
      pluginState: mockPluginStateInProgress,
    });
    httpClient.put.mockResolvedValue({
      pluginState: mockPluginStateInProgress,
    });
    apiService = new ApiService();
    apiService.setup(httpClient, true);
  });

  afterEach(() => {
    subscription?.unsubscribe();
    anotherSubscription?.unsubscribe();
    jest.restoreAllMocks();
  });

  describe('fetchPluginState$', () => {
    it('sends a request to the get state API', () => {
      subscription = apiService.fetchPluginState$().subscribe();
      expect(httpClient.get).toHaveBeenCalledTimes(1);
      expect(httpClient.get).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        signal: new AbortController().signal,
      });
    });

    it(`doesn't send multiple requests when there are several subscriptions`, () => {
      subscription = apiService.fetchPluginState$().subscribe();
      anotherSubscription = apiService.fetchPluginState$().subscribe();
      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });

    it(`doesn't send multiple requests if the request failed`, async () => {
      httpClient.get.mockRejectedValueOnce(new Error('request failed'));
      subscription = apiService.fetchPluginState$().subscribe();
      // wait until the request fails
      jest.runAllTimers();
      anotherSubscription = apiService.fetchPluginState$().subscribe();
      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });

    it(`re-sends the request if the subscription was unsubscribed before the request completed`, async () => {
      httpClient.get.mockImplementationOnce(() => {
        return new Promise((resolve) => setTimeout(resolve));
      });
      // subscribe and immediately unsubscribe
      apiService.fetchPluginState$().subscribe().unsubscribe();
      anotherSubscription = apiService.fetchPluginState$().subscribe();
      expect(httpClient.get).toHaveBeenCalledTimes(2);
    });

    it(`the second subscription gets the state broadcast to it`, (done) => {
      // first subscription
      apiService.fetchPluginState$().subscribe();
      // second subscription
      anotherSubscription = apiService.fetchPluginState$().subscribe((state) => {
        if (state) {
          done();
        }
      });
    });
  });

  describe('fetchAllGuidesState', () => {
    it('sends a request to the get guide API', async () => {
      await apiService.fetchAllGuidesState();
      expect(httpClient.get).toHaveBeenCalledTimes(1);
      expect(httpClient.get).toHaveBeenCalledWith(`${API_BASE_PATH}/guides`);
    });
  });

  describe('updatePluginState', () => {
    it('sends a request to the put state API when updating the guide', async () => {
      await apiService.updatePluginState({ guide: testGuideStep1InProgressState }, false);
      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({ guide: testGuideStep1InProgressState }),
      });
    });

    it('sends a request to the put state API when updating the status', async () => {
      await apiService.updatePluginState({ status: 'quit' }, false);
      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({ status: 'quit' }),
      });
    });
  });

  describe('activateGuide', () => {
    it('activates a guide by id', async () => {
      // mock the response of the activate route
      httpClient.post.mockResolvedValueOnce({
        pluginState: mockPluginStateInProgress,
      });
      apiService.setup(httpClient, true);

      await apiService.activateGuide(testGuideId);

      expect(httpClient.post).toHaveBeenCalledTimes(1);
      expect(httpClient.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/guides/activate/${testGuideId}`
      );
    });
  });

  describe('deactivateGuide', () => {
    it('deactivates an existing guide', async () => {
      await apiService.deactivateGuide(testGuideStep1ActiveState);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          status: 'quit',
          guide: {
            ...testGuideStep1ActiveState,
            isActive: false,
          },
        }),
      });
    });
  });

  describe('completeGuide', () => {
    beforeEach(async () => {
      httpClient.get.mockResolvedValue({
        pluginState: {
          ...mockPluginStateInProgress,
          activeGuide: readyToCompleteGuideState,
        },
      });
      apiService.setup(httpClient, true);
    });

    it('updates the selected guide and marks it as complete', async () => {
      await apiService.completeGuide(testGuideId);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          status: 'complete',
          guide: {
            ...readyToCompleteGuideState,
            isActive: false,
            status: 'complete',
          },
        }),
      });
    });

    it('the completed state is being broadcast after the update', async () => {
      httpClient.put.mockResolvedValueOnce({
        // mock the put api response
        pluginState: { status: 'complete', isActivePeriod: true },
      });
      await apiService.completeGuide(testGuideId);
      const updateState = await firstValueFrom(apiService.fetchPluginState$());
      expect(updateState?.status).toBe('complete');
    });

    it('returns undefined if the selected guide is not active', async () => {
      const completedState = await apiService.completeGuide('kubernetes'); // not active
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
      httpClient.get.mockResolvedValue({
        state: [incompleteGuideState],
      });
      apiService.setup(httpClient, true);
      const completedState = await apiService.completeGuide(testGuideId);
      expect(completedState).not.toBeDefined();
    });
  });

  describe('isGuideStepActive$', () => {
    it('returns true if the step has been started', (done) => {
      httpClient.get.mockResolvedValueOnce({
        pluginState: { ...mockPluginStateInProgress, activeGuide: testGuideStep1InProgressState },
      });

      apiService.setup(httpClient, true);
      subscription = apiService
        .isGuideStepActive$(testGuideId, testGuideFirstStep)
        .subscribe((isStepActive) => {
          if (isStepActive) {
            subscription.unsubscribe();
            done();
          }
        });
    });

    it('returns false if the step is not been started', (done) => {
      subscription = apiService
        .isGuideStepActive$(testGuideId, testGuideFirstStep)
        .subscribe((isStepActive) => {
          if (!isStepActive) {
            subscription.unsubscribe();
            done();
          }
        });
    });
  });

  describe('isGuideStepReadyToComplete$', () => {
    it('returns true if the step is ready to complete', (done) => {
      httpClient.get.mockResolvedValueOnce({
        pluginState: {
          ...mockPluginStateInProgress,
          activeGuide: testGuideStep2ReadyToCompleteState,
        },
      });
      apiService.setup(httpClient, true);

      subscription = apiService
        .isGuideStepReadyToComplete$(testGuideId, testGuideManualCompletionStep)
        .subscribe((isStepReadyToComplete) => {
          if (isStepReadyToComplete) {
            subscription.unsubscribe();
            done();
          }
        });
    });

    it('returns false if the step has not been started', (done) => {
      httpClient.get.mockResolvedValueOnce({
        pluginState: {
          ...mockPluginStateInProgress,
          activeGuide: testGuideStep2ActiveState,
        },
      });
      apiService.setup(httpClient, true);

      subscription = apiService
        .isGuideStepReadyToComplete$(testGuideId, testGuideManualCompletionStep)
        .subscribe((isStepActive) => {
          if (!isStepActive) {
            subscription.unsubscribe();
            done();
          }
        });
    });

    it('returns false if the step has been completed', (done) => {
      httpClient.get.mockResolvedValueOnce({
        pluginState: {
          ...mockPluginStateInProgress,
          activeGuide: testGuideStep3ActiveState,
        },
      });
      apiService.setup(httpClient, true);

      subscription = apiService
        .isGuideStepReadyToComplete$(testGuideId, testGuideManualCompletionStep)
        .subscribe((isStepActive) => {
          if (!isStepActive) {
            subscription.unsubscribe();
            done();
          }
        });
    });
  });

  describe('startGuideStep', () => {
    it('updates the selected step and marks it as in_progress', async () => {
      await apiService.startGuideStep(testGuideId, testGuideFirstStep);

      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({ guide: testGuideStep1InProgressState }),
      });
    });

    it('returns undefined if the selected guide is not active', async () => {
      const startState = await apiService.startGuideStep('kubernetes', 'add_data'); // not active
      expect(startState).not.toBeDefined();
    });
  });

  describe('completeGuideStep', () => {
    it(`completes the step when it's in progress`, async () => {
      httpClient.get.mockResolvedValue({
        pluginState: { ...mockPluginStateInProgress, activeGuide: testGuideStep1InProgressState },
      });
      apiService.setup(httpClient, true);

      await apiService.completeGuideStep(testGuideId, testGuideFirstStep);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // Verify the completed step now has a "complete" status, and the subsequent step is "active"
      expect(httpClient.put).toHaveBeenLastCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({ guide: { ...testGuideStep2ActiveState } }),
      });
    });

    it(`marks the step as 'ready_to_complete' if it's configured for manual completion`, async () => {
      httpClient.get.mockResolvedValueOnce({
        pluginState: { ...mockPluginStateInProgress, activeGuide: testGuideStep2InProgressState },
      });
      httpClient.get.mockResolvedValueOnce({
        config: testGuideConfig,
      });
      apiService.setup(httpClient, true);

      await apiService.completeGuideStep(testGuideId, testGuideManualCompletionStep);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // Verify the completed step now has a "ready_to_complete" status, and the subsequent step is "inactive"
      expect(httpClient.put).toHaveBeenLastCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          guide: {
            ...testGuideStep2InProgressState,
            steps: [
              testGuideStep2InProgressState.steps[0],
              { ...testGuideStep2InProgressState.steps[1], status: 'ready_to_complete' },
              testGuideStep2InProgressState.steps[2],
            ],
          },
        }),
      });
    });

    it('marks the guide as "ready_to_complete" if the current step is the last step in the guide and configured for manual completion', async () => {
      httpClient.get.mockResolvedValueOnce({
        pluginState: {
          ...mockPluginStateInProgress,
          activeGuide: {
            ...testGuideStep3ActiveState,
            steps: [
              ...testGuideStep3ActiveState.steps.slice(0, 2),
              { ...testGuideStep3ActiveState.steps[2], status: 'ready_to_complete' },
            ],
          },
        },
      });
      httpClient.get.mockResolvedValueOnce({
        config: testGuideConfig,
      });
      apiService.setup(httpClient, true);

      await apiService.completeGuideStep(testGuideId, testGuideLastStep);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // Verify the guide now has a "ready_to_complete" status and the last step is "complete"
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          guide: {
            ...testGuideStep3ActiveState,
            status: 'ready_to_complete',
            steps: [
              ...testGuideStep3ActiveState.steps.slice(0, 2),
              { ...testGuideStep3ActiveState.steps[2], status: 'complete' },
            ],
          },
        }),
      });
    });

    it('marks the guide as "in_progress" if the current step is not the last step in the guide', async () => {
      httpClient.get.mockResolvedValue({
        pluginState: {
          ...mockPluginStateInProgress,
          activeGuide: testGuideStep1InProgressState,
        },
      });
      apiService.setup(httpClient, true);

      await apiService.completeGuideStep(testGuideId, testGuideFirstStep);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // Verify the guide now has an "in_progress" status and the second step is "active"
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          guide: {
            ...testGuideStep3ActiveState,
            steps: [
              testGuideStep2ActiveState.steps[0],
              { ...testGuideStep2ActiveState.steps[1], status: 'active' },
              testGuideStep2ActiveState.steps[2],
            ],
          },
        }),
      });
    });

    it('does nothing if the step is not in progress', async () => {
      // by default the state set in beforeEach is test guide, step 1 active
      await apiService.completeGuideStep(testGuideId, testGuideFirstStep);
      expect(httpClient.put).toHaveBeenCalledTimes(0);
    });

    it('returns undefined if the selected guide is not active', async () => {
      const startState = await apiService.completeGuideStep('kubernetes', 'add_data'); // not active
      expect(startState).not.toBeDefined();
    });
  });

  describe('isGuidedOnboardingActiveForIntegration$', () => {
    it('returns true if the integration is part of the active step', (done) => {
      httpClient.get.mockResolvedValueOnce({
        pluginState: { ...mockPluginStateInProgress, activeGuide: testGuideStep1InProgressState },
      });
      httpClient.get.mockResolvedValueOnce({
        config: testGuideConfig,
      });
      apiService.setup(httpClient, true);
      subscription = apiService
        .isGuidedOnboardingActiveForIntegration$(testIntegration)
        .subscribe((isIntegrationInGuideStep) => {
          if (isIntegrationInGuideStep) {
            subscription.unsubscribe();
            done();
          }
        });
    });

    it('returns false if the current step has a different integration', (done) => {
      httpClient.get.mockResolvedValue({
        pluginState: { ...mockPluginStateInProgress, activeGuide: testGuideStep1InProgressState },
      });
      apiService.setup(httpClient, true);
      subscription = apiService
        .isGuidedOnboardingActiveForIntegration$(wrongIntegration)
        .subscribe((isIntegrationInGuideStep) => {
          if (!isIntegrationInGuideStep) {
            subscription.unsubscribe();
            done();
          }
        });
    });

    it('returns false if no guide is active', (done) => {
      httpClient.get.mockResolvedValue({
        pluginState: { ...mockPluginStateNotStarted, activeGuide: testGuideNotActiveState },
      });
      apiService.setup(httpClient, true);
      subscription = apiService
        .isGuidedOnboardingActiveForIntegration$(testIntegration)
        .subscribe((isIntegrationInGuideStep) => {
          if (!isIntegrationInGuideStep) {
            subscription.unsubscribe();
            done();
          }
        });
    });
  });

  describe('completeGuidedOnboardingForIntegration', () => {
    it(`completes the step if it's active for the integration`, async () => {
      httpClient.get.mockResolvedValueOnce({
        pluginState: { ...mockPluginStateInProgress, activeGuide: testGuideStep1InProgressState },
      });
      httpClient.get.mockResolvedValueOnce({
        config: testGuideConfig,
      });
      apiService.setup(httpClient, true);

      await apiService.completeGuidedOnboardingForIntegration(testIntegration);
      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // this assertion depends on the guides config
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({ guide: testGuideStep2ActiveState }),
      });
    });

    it(`does nothing if the step has a different integration`, async () => {
      httpClient.get.mockResolvedValue({
        pluginState: { ...mockPluginStateInProgress, activeGuide: testGuideStep1InProgressState },
      });
      apiService.setup(httpClient, true);

      await apiService.completeGuidedOnboardingForIntegration(wrongIntegration);
      expect(httpClient.put).not.toHaveBeenCalled();
    });

    it(`does nothing if no guide is active`, async () => {
      httpClient.get.mockResolvedValue({
        pluginState: { ...mockPluginStateNotStarted, activeGuide: testGuideNotActiveState },
      });

      await apiService.completeGuidedOnboardingForIntegration(testIntegration);
      expect(httpClient.put).not.toHaveBeenCalled();
    });
  });

  describe('skipGuidedOnboarding', () => {
    it(`sends a request to the put state API`, async () => {
      await apiService.skipGuidedOnboarding();
      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // this assertion depends on the guides config
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({ status: 'skipped' }),
      });
    });
  });

  describe('isLoading$', () => {
    it('is false by default', () => {
      const isLoading = apiService.isLoading$.value;
      expect(isLoading).toBe(false);
    });

    const testRequest = async (isFailedRequest?: boolean) => {
      // advance the time to "while" the request is in flight
      jest.advanceTimersByTime(1000);
      expect(apiService.isLoading$.value).toBe(true);

      // advance the time to "after" the request has completed
      jest.runAllTimers();
      if (isFailedRequest) {
        // next tick to allow the code in the "catch" clause to run
        await Promise.reject().catch(() => {});
      }
      // next tick to allow the code in the "then" clause to run
      await Promise.resolve().then(() => {});
      expect(apiService.isLoading$.value).toBe(false);
    };

    describe('is updated when fetching plugin state', () => {
      it('true while request is in flight, false after the request completes', async () => {
        httpClient.get.mockImplementation(() => {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  pluginState: mockPluginStateNotStarted,
                }),
              2000
            )
          );
        });
        apiService.setup(httpClient, true);
        // starting the request
        subscription = apiService.fetchPluginState$().subscribe();
        await testRequest();
      });

      it('true while request is in flight, false after the request fails', async () => {
        httpClient.get.mockImplementation(() => {
          return new Promise((resolve, reject) =>
            setTimeout(() => reject(new Error('test')), 2000)
          );
        });
        apiService.setup(httpClient, true);
        // starting the request
        subscription = apiService.fetchPluginState$().subscribe();

        await testRequest(true);
      });
    });

    describe('is updated when fetching all guides state', () => {
      it('true while request is in flight, false after the request completes', async () => {
        httpClient.get.mockImplementation(() => {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  state: [],
                }),
              2000
            )
          );
        });
        apiService.setup(httpClient, true);
        // starting the request
        apiService.fetchAllGuidesState().then();

        await testRequest();
      });

      it('true while request is in flight, false after the request fails', async () => {
        httpClient.get.mockImplementation(() => {
          return new Promise((resolve, reject) =>
            setTimeout(() => reject(new Error('test')), 2000)
          );
        });
        apiService.setup(httpClient, true);
        // starting the request
        apiService.fetchAllGuidesState().catch(() => {});

        await testRequest(true);
      });
    });

    describe('is updated when updating guide state', () => {
      it('true while request is in flight, false after the request completes', async () => {
        httpClient.put.mockImplementation(() => {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  pluginState: mockPluginStateNotStarted,
                }),
              2000
            )
          );
        });
        apiService.setup(httpClient, true);
        // starting the request
        apiService.updatePluginState({}, true).then();

        await testRequest();
      });

      it('true while request is in flight, false after the request fails', async () => {
        httpClient.put.mockImplementation(() => {
          return new Promise((resolve, reject) =>
            setTimeout(() => reject(new Error('test')), 2000)
          );
        });
        apiService.setup(httpClient, true);
        // starting the request
        apiService.updatePluginState({}, true).catch(() => {});

        await testRequest(true);
      });
    });

    describe('is updated when fetching guide config', () => {
      it('true while request is in flight, false after the request completes', async () => {
        httpClient.get.mockImplementation(() => {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  config: testGuideConfig,
                }),
              2000
            )
          );
        });
        apiService.setup(httpClient, true);
        // starting the request
        apiService.getGuideConfig(testGuideId).then(() => {});

        await testRequest();
      });

      it('true while request is in flight, false after the request fails', async () => {
        httpClient.get.mockImplementation(() => {
          return new Promise((resolve, reject) =>
            setTimeout(() => reject(new Error('test')), 2000)
          );
        });
        apiService.setup(httpClient, true);
        // starting the request
        apiService.getGuideConfig(testGuideId).catch(() => {});

        await testRequest(true);
      });
    });
  });

  describe('getGuideConfig', () => {
    it('sends a request to the get config API', async () => {
      apiService.setup(httpClient, true);
      await apiService.getGuideConfig(testGuideId);
      expect(httpClient.get).toHaveBeenCalledTimes(1);
      expect(httpClient.get).toHaveBeenCalledWith(`${API_BASE_PATH}/configs/${testGuideId}`);
    });
  });

  describe('no API requests are sent on self-managed deployments', () => {
    beforeEach(() => {
      apiService.setup(httpClient, false);
    });

    it('fetchPluginState$', () => {
      subscription = apiService.fetchPluginState$().subscribe();
      expect(httpClient.get).not.toHaveBeenCalled();
    });

    it('fetchAllGuidesState', async () => {
      await apiService.fetchAllGuidesState();
      expect(httpClient.get).not.toHaveBeenCalled();
    });

    it('updatePluginState', async () => {
      await apiService.updatePluginState({}, false);
      expect(httpClient.put).not.toHaveBeenCalled();
    });

    it('getGuideConfig', async () => {
      await apiService.getGuideConfig(testGuideId);
      expect(httpClient.get).not.toHaveBeenCalled();
    });
  });
});
