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
import { guidesConfig } from '../constants/guides_config';
import { ApiService } from './api';
import {
  noGuideActiveState,
  searchAddDataActiveState,
  securityAddDataInProgressState,
  securityRulesActiveState,
} from './api.mocks';

const searchGuide = 'search';
const firstStep = guidesConfig[searchGuide].steps[0].id;
const endpointIntegration = 'endpoint';
const kubernetesIntegration = 'kubernetes';

describe('GuidedOnboarding ApiService', () => {
  let httpClient: jest.Mocked<HttpSetup>;
  let apiService: ApiService;
  let subscription: Subscription;

  beforeEach(() => {
    httpClient = httpServiceMock.createStartContract({ basePath: '/base/path' });
    httpClient.get.mockResolvedValue({
      state: [securityAddDataInProgressState],
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
      await apiService.activateGuide(searchGuide, searchAddDataActiveState);

      const state = await firstValueFrom(apiService.fetchActiveGuideState$());
      expect(state).toEqual(searchAddDataActiveState);
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
      await apiService.deactivateGuide(searchAddDataActiveState);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          ...searchAddDataActiveState,
          isActive: false,
        }),
      });
    });
  });

  describe('updateGuideState', () => {
    it('sends a request to the put API', async () => {
      const updatedState: GuideState = {
        ...searchAddDataActiveState,
        steps: [
          {
            id: searchAddDataActiveState.steps[0].id,
            status: 'in_progress', // update the first step status
          },
          searchAddDataActiveState.steps[1],
          searchAddDataActiveState.steps[2],
        ],
      };
      await apiService.updateGuideState(updatedState, false);
      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify(updatedState),
      });
    });
  });

  describe('isGuideStepActive$', () => {
    it('returns true if the step has been started', (done) => {
      const updatedState: GuideState = {
        ...searchAddDataActiveState,
        steps: [
          {
            id: searchAddDataActiveState.steps[0].id,
            status: 'in_progress',
          },
          searchAddDataActiveState.steps[1],
          searchAddDataActiveState.steps[2],
        ],
      };
      apiService.updateGuideState(updatedState, false);
      subscription = apiService
        .isGuideStepActive$(searchGuide, firstStep)
        .subscribe((isStepActive) => {
          if (isStepActive) {
            done();
          }
        });
    });

    it('returns false if the step is not been started', (done) => {
      apiService.updateGuideState(searchAddDataActiveState, false);
      subscription = apiService
        .isGuideStepActive$(searchGuide, firstStep)
        .subscribe((isStepActive) => {
          if (!isStepActive) {
            done();
          }
        });
    });
  });

  describe('activateGuide', () => {
    it('activates a new guide', async () => {
      await apiService.activateGuide(searchGuide);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          isActive: true,
          status: 'not_started',
          steps: [
            {
              id: 'add_data',
              status: 'active',
            },
            {
              id: 'browse_docs',
              status: 'inactive',
            },
            {
              id: 'search_experience',
              status: 'inactive',
            },
          ],
          guideId: searchGuide,
        }),
      });
    });

    it('reactivates a guide that has already been started', async () => {
      await apiService.activateGuide(searchGuide, searchAddDataActiveState);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify(searchAddDataActiveState),
      });
    });
  });

  describe('completeGuide', () => {
    const readyToCompleteGuideState: GuideState = {
      ...searchAddDataActiveState,
      steps: [
        {
          id: 'add_data',
          status: 'complete',
        },
        {
          id: 'browse_docs',
          status: 'complete',
        },
        {
          id: 'search_experience',
          status: 'complete',
        },
      ],
    };

    beforeEach(async () => {
      await apiService.updateGuideState(readyToCompleteGuideState, false);
    });

    it('updates the selected guide and marks it as complete', async () => {
      await apiService.completeGuide(searchGuide);

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
        ...searchAddDataActiveState,
        steps: [
          {
            id: 'add_data',
            status: 'complete',
          },
          {
            id: 'browse_docs',
            status: 'complete',
          },
          {
            id: 'search_experience',
            status: 'in_progress',
          },
        ],
      };
      await apiService.updateGuideState(incompleteGuideState, false);

      const completedState = await apiService.completeGuide(searchGuide);
      expect(completedState).not.toBeDefined();
    });
  });

  describe('startGuideStep', () => {
    beforeEach(async () => {
      await apiService.updateGuideState(searchAddDataActiveState, false);
    });

    it('updates the selected step and marks it as in_progress', async () => {
      await apiService.startGuideStep(searchGuide, firstStep);

      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          ...searchAddDataActiveState,
          isActive: true,
          status: 'in_progress',
          steps: [
            {
              id: searchAddDataActiveState.steps[0].id,
              status: 'in_progress',
            },
            searchAddDataActiveState.steps[1],
            searchAddDataActiveState.steps[2],
          ],
        }),
      });
    });

    it('returns undefined if the selected guide is not active', async () => {
      const startState = await apiService.startGuideStep('observability', 'add_data'); // not active
      expect(startState).not.toBeDefined();
    });
  });

  describe('completeGuideStep', () => {
    it(`completes the step when it's in progress`, async () => {
      const updatedState: GuideState = {
        ...searchAddDataActiveState,
        steps: [
          {
            id: searchAddDataActiveState.steps[0].id,
            status: 'in_progress', // Mark a step as in_progress in order to test the "completeGuideStep" behavior
          },
          searchAddDataActiveState.steps[1],
          searchAddDataActiveState.steps[2],
        ],
      };
      await apiService.updateGuideState(updatedState, false);

      await apiService.completeGuideStep(searchGuide, firstStep);

      // Once on update, once on complete
      expect(httpClient.put).toHaveBeenCalledTimes(2);
      // Verify the completed step now has a "complete" status, and the subsequent step is "active"
      expect(httpClient.put).toHaveBeenLastCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          ...updatedState,
          steps: [
            {
              id: searchAddDataActiveState.steps[0].id,
              status: 'complete',
            },
            {
              id: searchAddDataActiveState.steps[1].id,
              status: 'active',
            },
            searchAddDataActiveState.steps[2],
          ],
        }),
      });
    });

    it(`marks the step as 'ready_to_complete' if it's configured for manual completion`, async () => {
      const securityRulesInProgressState = {
        ...securityRulesActiveState,
        steps: [
          securityRulesActiveState.steps[0],
          {
            id: securityRulesActiveState.steps[1].id,
            status: 'in_progress',
          },
          securityRulesActiveState.steps[2],
        ],
      };
      httpClient.get.mockResolvedValue({
        state: [securityRulesInProgressState],
      });
      apiService.setup(httpClient);

      await apiService.completeGuideStep('security', 'rules');

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // Verify the completed step now has a "ready_to_complete" status, and the subsequent step is "inactive"
      expect(httpClient.put).toHaveBeenLastCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          ...securityRulesInProgressState,
          steps: [
            securityRulesInProgressState.steps[0],
            {
              id: securityRulesInProgressState.steps[1].id,
              status: 'ready_to_complete',
            },
            {
              id: securityRulesInProgressState.steps[2].id,
              status: 'inactive',
            },
          ],
        }),
      });
    });

    it('returns undefined if the selected guide is not active', async () => {
      const startState = await apiService.completeGuideStep('observability', 'add_data'); // not active
      expect(startState).not.toBeDefined();
    });

    it('does nothing if the step is not in progress', async () => {
      httpClient.get.mockResolvedValue({
        state: [searchAddDataActiveState],
      });
      apiService.setup(httpClient);

      await apiService.completeGuideStep(searchGuide, firstStep);
      expect(httpClient.put).toHaveBeenCalledTimes(0);
    });
  });

  describe('isGuidedOnboardingActiveForIntegration$', () => {
    it('returns true if the integration is part of the active step', (done) => {
      httpClient.get.mockResolvedValue({
        state: [securityAddDataInProgressState],
      });
      apiService.setup(httpClient);
      subscription = apiService
        .isGuidedOnboardingActiveForIntegration$(endpointIntegration)
        .subscribe((isIntegrationInGuideStep) => {
          if (isIntegrationInGuideStep) {
            done();
          }
        });
    });

    it('returns false if another integration is part of the active step', (done) => {
      httpClient.get.mockResolvedValue({
        state: [securityAddDataInProgressState],
      });
      apiService.setup(httpClient);
      subscription = apiService
        .isGuidedOnboardingActiveForIntegration$(kubernetesIntegration)
        .subscribe((isIntegrationInGuideStep) => {
          if (!isIntegrationInGuideStep) {
            done();
          }
        });
    });

    it('returns false if no guide is active', (done) => {
      httpClient.get.mockResolvedValue({
        state: [noGuideActiveState],
      });
      apiService.setup(httpClient);
      subscription = apiService
        .isGuidedOnboardingActiveForIntegration$(endpointIntegration)
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
        state: [securityAddDataInProgressState],
      });
      apiService.setup(httpClient);

      await apiService.completeGuidedOnboardingForIntegration(endpointIntegration);
      expect(httpClient.put).toHaveBeenCalledTimes(1);
      // this assertion depends on the guides config
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify(securityRulesActiveState),
      });
    });

    it(`does nothing if the step has a different integration`, async () => {
      httpClient.get.mockResolvedValue({
        state: [securityAddDataInProgressState],
      });
      apiService.setup(httpClient);

      await apiService.completeGuidedOnboardingForIntegration(kubernetesIntegration);
      expect(httpClient.put).not.toHaveBeenCalled();
    });

    it(`does nothing if no guide is active`, async () => {
      httpClient.get.mockResolvedValue({
        state: [noGuideActiveState],
      });
      apiService.setup(httpClient);

      await apiService.completeGuidedOnboardingForIntegration(endpointIntegration);
      expect(httpClient.put).not.toHaveBeenCalled();
    });
  });
});
