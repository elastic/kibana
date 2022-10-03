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

import { API_BASE_PATH } from '../../common/constants';
import { guidesConfig } from '../constants/guides_config';
import type { GuideState } from '../../common/types';
import { ApiService } from './api';

const searchGuide = 'search';
const firstStep = guidesConfig[searchGuide].steps[0].id;

const mockActiveSearchGuideState: GuideState = {
  guideId: searchGuide,
  isActive: true,
  status: 'in_progress',
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
};

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

  describe('fetchActiveGuideState$', () => {
    it('sends a request to the get API', () => {
      subscription = apiService.fetchActiveGuideState$().subscribe();
      expect(httpClient.get).toHaveBeenCalledTimes(1);
      expect(httpClient.get).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        query: { active: true },
      });
    });

    it('broadcasts the updated state', async () => {
      await apiService.activateGuide(searchGuide);

      const state = await firstValueFrom(apiService.fetchActiveGuideState$());
      expect(state).toEqual(mockActiveSearchGuideState);
    });
  });

  describe('fetchAllGuidesState', () => {
    it('sends a request to the get API', async () => {
      await apiService.fetchAllGuidesState();
      expect(httpClient.get).toHaveBeenCalledTimes(1);
      expect(httpClient.get).toHaveBeenCalledWith(`${API_BASE_PATH}/state`);
    });
  });

  describe('updateGuideState', () => {
    it('sends a request to the put API', async () => {
      const updatedState: GuideState = {
        ...mockActiveSearchGuideState,
        steps: [
          {
            id: mockActiveSearchGuideState.steps[0].id,
            status: 'in_progress', // update the first step status
          },
          mockActiveSearchGuideState.steps[1],
          mockActiveSearchGuideState.steps[2],
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
    it('returns true if the step has been started', async (done) => {
      const updatedState: GuideState = {
        ...mockActiveSearchGuideState,
        steps: [
          {
            id: mockActiveSearchGuideState.steps[0].id,
            status: 'in_progress',
          },
          mockActiveSearchGuideState.steps[1],
          mockActiveSearchGuideState.steps[2],
        ],
      };
      await apiService.updateGuideState(updatedState, false);

      subscription = apiService
        .isGuideStepActive$(searchGuide, firstStep)
        .subscribe((isStepActive) => {
          if (isStepActive) {
            done();
          }
        });
    });

    it('returns false if the step is not been started', async (done) => {
      await apiService.updateGuideState(mockActiveSearchGuideState, false);
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
          status: 'in_progress',
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
      await apiService.activateGuide(searchGuide, mockActiveSearchGuideState);

      expect(httpClient.put).toHaveBeenCalledTimes(1);
      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          ...mockActiveSearchGuideState,
          isActive: true,
        }),
      });
    });
  });

  describe('completeGuide', () => {
    const readyToCompleteGuideState: GuideState = {
      ...mockActiveSearchGuideState,
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
        ...mockActiveSearchGuideState,
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
      await apiService.updateGuideState(mockActiveSearchGuideState, false);
    });

    it('updates the selected step and marks it as in_progress', async () => {
      await apiService.startGuideStep(searchGuide, firstStep);

      expect(httpClient.put).toHaveBeenCalledWith(`${API_BASE_PATH}/state`, {
        body: JSON.stringify({
          ...mockActiveSearchGuideState,
          isActive: true,
          status: 'in_progress',
          steps: [
            {
              id: mockActiveSearchGuideState.steps[0].id,
              status: 'in_progress',
            },
            mockActiveSearchGuideState.steps[1],
            mockActiveSearchGuideState.steps[2],
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
        ...mockActiveSearchGuideState,
        steps: [
          {
            id: mockActiveSearchGuideState.steps[0].id,
            status: 'in_progress', // Mark a step as in_progress in order to test the "completeGuideStep" behavior
          },
          mockActiveSearchGuideState.steps[1],
          mockActiveSearchGuideState.steps[2],
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
              id: mockActiveSearchGuideState.steps[0].id,
              status: 'complete',
            },
            {
              id: mockActiveSearchGuideState.steps[1].id,
              status: 'active',
            },
            mockActiveSearchGuideState.steps[2],
          ],
        }),
      });
    });

    it('returns undefined if the selected guide is not active', async () => {
      const startState = await apiService.completeGuideStep('observability', 'add_data'); // not active
      expect(startState).not.toBeDefined();
    });

    it('does nothing if the step is not in progress', async () => {
      await apiService.updateGuideState(mockActiveSearchGuideState, false);

      await apiService.completeGuideStep(searchGuide, firstStep);
      // Expect only 1 call from updateGuideState()
      expect(httpClient.put).toHaveBeenCalledTimes(1);
    });
  });
});
