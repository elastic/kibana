/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act } from 'react-dom/test-utils';
import React from 'react';

import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { HttpSetup } from '@kbn/core/public';

import { guidesConfig } from '../constants/guides_config';
import type { GuideState } from '../../common/types';
import { apiService } from '../services/api';
import { GuidePanel } from './guide_panel';
import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';

const applicationMock = applicationServiceMock.createStartContract();

const mockActiveSearchGuideState: GuideState = {
  guideId: 'search',
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

const getGuidePanel = () => () => {
  return <GuidePanel application={applicationMock} api={apiService} />;
};

describe('Guided setup', () => {
  let httpClient: jest.Mocked<HttpSetup>;
  let testBed: TestBed;

  beforeEach(async () => {
    httpClient = httpServiceMock.createStartContract({ basePath: '/base/path' });
    // Set default state on initial request (no active guides)
    httpClient.get.mockResolvedValue({
      state: [],
    });
    apiService.setup(httpClient);

    await act(async () => {
      const GuidePanelComponent = getGuidePanel();
      testBed = registerTestBed(GuidePanelComponent)();
    });

    testBed.component.update();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Button component', () => {
    test('should be disabled in there is no active guide', async () => {
      const { exists } = testBed;
      expect(exists('disabledGuideButton')).toBe(true);
      expect(exists('guideButton')).toBe(false);
      expect(exists('guidePanel')).toBe(false);
    });

    test('should be enabled if there is an active guide', async () => {
      const { exists, component, find } = testBed;

      await act(async () => {
        // Enable the "search" guide
        await apiService.updateGuideState(mockActiveSearchGuideState, true);
      });

      component.update();

      expect(exists('disabledGuideButton')).toBe(false);
      expect(exists('guideButton')).toBe(true);
      expect(find('guideButton').text()).toEqual('Setup guide');
    });

    test('should show the step number in the button label if a step is active', async () => {
      const { component, find } = testBed;

      const mockInProgressSearchGuideState: GuideState = {
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

      await act(async () => {
        await apiService.updateGuideState(mockInProgressSearchGuideState, true);
      });

      component.update();

      expect(find('guideButton').text()).toEqual('Setup guide: step 1');
    });
  });

  describe('Panel component', () => {
    test('should be enabled if a guide is activated', async () => {
      const { exists, component, find } = testBed;

      await act(async () => {
        // Enable the "search" guide
        await apiService.updateGuideState(mockActiveSearchGuideState, true);
      });

      component.update();

      expect(exists('guidePanel')).toBe(true);
      expect(exists('guideProgress')).toBe(false);
      expect(find('guidePanelStep').length).toEqual(guidesConfig.search.steps.length);
    });

    test('should show the progress bar if the first step has been completed', async () => {
      const { component, exists } = testBed;

      const mockInProgressSearchGuideState: GuideState = {
        ...mockActiveSearchGuideState,
        steps: [
          {
            id: mockActiveSearchGuideState.steps[0].id,
            status: 'complete',
          },
          mockActiveSearchGuideState.steps[1],
          mockActiveSearchGuideState.steps[2],
        ],
      };

      await act(async () => {
        await apiService.updateGuideState(mockInProgressSearchGuideState, true);
      });

      component.update();

      expect(exists('guidePanel')).toBe(true);
      expect(exists('guideProgress')).toBe(true);
    });

    test('should show the "Continue using Elastic" button when all steps has been completed', async () => {
      const { component, exists } = testBed;

      const readyToCompleteGuideState: GuideState = {
        guideId: 'search',
        status: 'ready_to_complete',
        isActive: true,
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

      await act(async () => {
        await apiService.updateGuideState(readyToCompleteGuideState, true);
      });

      component.update();

      expect(exists('useElasticButton')).toBe(true);
    });

    describe('Steps', () => {
      test('should show "Start" button label if step has not been started', async () => {
        const { component, find } = testBed;

        await act(async () => {
          // Enable the "search" guide
          await apiService.updateGuideState(mockActiveSearchGuideState, true);
        });

        component.update();

        expect(find('activeStepButtonLabel').text()).toEqual('Start');
      });

      test('should show "Continue" button label if step is in progress', async () => {
        const { component, find } = testBed;

        const mockInProgressSearchGuideState: GuideState = {
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

        await act(async () => {
          await apiService.updateGuideState(mockInProgressSearchGuideState, true);
        });

        component.update();

        expect(find('activeStepButtonLabel').text()).toEqual('Continue');
      });
    });
  });
});
