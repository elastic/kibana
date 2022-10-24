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
import type { GuideId, GuideState } from '@kbn/guided-onboarding';

import { guidesConfig } from '../constants/guides_config';
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

const mockReadyToCompleteSearchGuideState: GuideState = {
  ...mockActiveSearchGuideState,
  steps: [
    {
      id: mockActiveSearchGuideState.steps[0].id,
      status: 'complete',
    },
    {
      id: mockActiveSearchGuideState.steps[1].id,
      status: 'ready_to_complete',
    },
    mockActiveSearchGuideState.steps[2],
  ],
};

const updateComponentWithState = async (
  component: TestBed['component'],
  guideState: GuideState,
  isPanelOpen: boolean
) => {
  await act(async () => {
    await apiService.updateGuideState(guideState, isPanelOpen);
  });

  component.update();
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
    // TODO check for the correct button behavior once https://github.com/elastic/kibana/issues/141129 is implemented
    test.skip('should be disabled in there is no active guide', async () => {
      const { exists } = testBed;
      expect(exists('disabledGuideButton')).toBe(true);
      expect(exists('guideButton')).toBe(false);
      expect(exists('guidePanel')).toBe(false);
    });

    test('should be enabled if there is an active guide', async () => {
      const { exists, component, find } = testBed;

      // Enable the "search" guide
      await updateComponentWithState(component, mockActiveSearchGuideState, true);

      expect(exists('disabledGuideButton')).toBe(false);
      expect(exists('guideButton')).toBe(true);
      expect(find('guideButton').text()).toEqual('Setup guide');
    });

    test('should show the step number in the button label if a step is active', async () => {
      const { component, find } = testBed;

      await updateComponentWithState(component, mockInProgressSearchGuideState, true);

      expect(find('guideButton').text()).toEqual('Setup guide: step 1');
    });

    test('shows the step number in the button label if a step is ready to complete', async () => {
      const { component, find } = testBed;

      await updateComponentWithState(component, mockReadyToCompleteSearchGuideState, true);

      expect(find('guideButton').text()).toEqual('Setup guide: step 2');
    });

    test('shows the manual completion popover if a step is ready to complete', async () => {
      const { component, exists } = testBed;

      await updateComponentWithState(component, mockReadyToCompleteSearchGuideState, false);

      expect(exists('manualCompletionPopover')).toBe(true);
    });

    test('shows no manual completion popover if a step is in progress', async () => {
      const { component, exists } = testBed;

      await updateComponentWithState(component, mockInProgressSearchGuideState, false);

      expect(exists('manualCompletionPopoverPanel')).toBe(false);
    });
  });

  describe('Panel component', () => {
    test('should be enabled if a guide is activated', async () => {
      const { exists, component, find } = testBed;

      await updateComponentWithState(component, mockActiveSearchGuideState, true);

      expect(exists('guidePanel')).toBe(true);
      expect(exists('guideProgress')).toBe(false);
      expect(find('guidePanelStep').length).toEqual(guidesConfig.search.steps.length);
    });

    test('should show the progress bar if the first step has been completed', async () => {
      const { component, exists } = testBed;

      const mockCompleteSearchGuideState: GuideState = {
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

      await updateComponentWithState(component, mockCompleteSearchGuideState, true);

      expect(exists('guidePanel')).toBe(true);
      expect(exists('guideProgress')).toBe(true);
    });

    test('should show the completed state when all steps has been completed', async () => {
      const { component, exists, find } = testBed;

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

      await updateComponentWithState(component, readyToCompleteGuideState, true);

      expect(find('guideTitle').text()).toContain('Well done');
      expect(find('guideDescription').text()).toContain(
        `You've completed the Elastic Enterprise Search guide`
      );
      expect(exists('onboarding--completeGuideButton--search')).toBe(true);
    });

    describe('Steps', () => {
      const clickStepButton = async ({
        guideId,
        stepNumber,
      }: {
        guideId: GuideId;
        stepNumber: number;
      }) => {
        const { component, find } = testBed;

        await act(async () => {
          find(`onboarding--stepButton--${guideId}--step${stepNumber}`).simulate('click');
        });

        component.update();
      };

      test('can start a step if step has not been started', async () => {
        const { component, find, exists } = testBed;

        await updateComponentWithState(component, mockActiveSearchGuideState, true);

        expect(find('onboarding--stepButton--search--step1').text()).toEqual('Start');

        await clickStepButton({ guideId: 'search', stepNumber: 1 });

        expect(exists('guidePanel')).toBe(false);
      });

      test('can continue a step if step is in progress', async () => {
        const { component, find, exists } = testBed;

        await updateComponentWithState(component, mockInProgressSearchGuideState, true);

        expect(find('onboarding--stepButton--search--step1').text()).toEqual('Continue');

        await clickStepButton({ guideId: 'search', stepNumber: 1 });

        expect(exists('guidePanel')).toBe(false);
      });

      test('can mark a step "done" if step is ready to complete', async () => {
        const { component, find, exists } = testBed;

        await updateComponentWithState(component, mockReadyToCompleteSearchGuideState, true);

        expect(find('onboarding--stepButton--search--step2').text()).toEqual('Mark done');

        await clickStepButton({ guideId: 'search', stepNumber: 2 });

        // The guide panel should remain open after marking a step done
        expect(exists('guidePanel')).toBe(true);
        // Dependent on the Search guide config, which expects step 3 to start
        expect(find('onboarding--stepButton--search--step3').text()).toEqual('Start');
      });
    });

    describe('Quit guide modal', () => {
      beforeEach(async () => {
        const { component, find, exists } = testBed;

        await act(async () => {
          // Enable the "search" guide
          await apiService.updateGuideState(mockActiveSearchGuideState, true);
        });

        component.update();

        await act(async () => {
          find('quitGuideButton').simulate('click');
        });

        component.update();

        expect(exists('onboarding--quitGuideModal')).toBe(true);
      });

      test('quit a guide', async () => {
        const { component, find, exists } = testBed;

        await act(async () => {
          find('confirmModalConfirmButton').simulate('click');
        });

        component.update();

        expect(exists('onboarding--quitGuideModal')).toBe(false);

        // TODO check for the correct button behavior once https://github.com/elastic/kibana/issues/141129 is implemented
      });

      test('cancels out of the quit guide confirmation modal', async () => {
        const { component, find, exists } = testBed;

        await act(async () => {
          find('confirmModalCancelButton').simulate('click');
        });

        component.update();

        expect(exists('onboarding--quitGuideModal')).toBe(false);
        expect(exists('guideButton')).toBe(true);
      });
    });
  });
});
