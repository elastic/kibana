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
import type { GuideState } from '@kbn/guided-onboarding';

import { guidesConfig } from '../constants/guides_config';
import { apiService } from '../services/api';
import { GuidePanel } from './guide_panel';
import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';

const applicationMock = applicationServiceMock.createStartContract();

const mockActiveTestGuideState: GuideState = {
  guideId: 'testGuide',
  isActive: true,
  status: 'in_progress',
  steps: [
    {
      id: 'step1',
      status: 'active',
    },
    {
      id: 'step2',
      status: 'inactive',
    },
    {
      id: 'step3',
      status: 'inactive',
    },
  ],
};

const mockInProgressTestGuideState: GuideState = {
  ...mockActiveTestGuideState,
  steps: [
    {
      ...mockActiveTestGuideState.steps[0],
      status: 'in_progress',
    },
    mockActiveTestGuideState.steps[1],
    mockActiveTestGuideState.steps[2],
  ],
};

const mockReadyToCompleteTestGuideState: GuideState = {
  ...mockActiveTestGuideState,
  steps: [
    {
      ...mockActiveTestGuideState.steps[0],
      status: 'complete',
    },
    {
      ...mockActiveTestGuideState.steps[1],
      status: 'ready_to_complete',
    },
    mockActiveTestGuideState.steps[2],
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
    test('should be hidden in there is no guide state', async () => {
      const { exists } = testBed;
      expect(exists('guideButton')).toBe(false);
      expect(exists('guidePanel')).toBe(false);
    });

    test('should be hidden if the guide is not active', async () => {
      const { component, exists } = testBed;

      await updateComponentWithState(
        component,
        { ...mockActiveTestGuideState, isActive: false },
        true
      );

      expect(exists('guideButton')).toBe(false);
      expect(exists('guidePanel')).toBe(false);
    });

    test('should be enabled if there is an active guide', async () => {
      const { exists, component, find } = testBed;

      // Enable the "test" guide
      await updateComponentWithState(component, mockActiveTestGuideState, true);

      expect(exists('guideButton')).toBe(true);
      expect(find('guideButton').text()).toEqual('Setup guide');
    });

    test('should show the step number in the button label if a step is active', async () => {
      const { component, find } = testBed;

      await updateComponentWithState(component, mockInProgressTestGuideState, true);

      expect(find('guideButton').text()).toEqual('Setup guide: step 1');
    });

    test('shows the step number in the button label if a step is ready to complete', async () => {
      const { component, find } = testBed;

      await updateComponentWithState(component, mockReadyToCompleteTestGuideState, true);

      expect(find('guideButton').text()).toEqual('Setup guide: step 2');
    });

    test('shows the manual completion popover if a step is ready to complete', async () => {
      const { component, exists } = testBed;

      await updateComponentWithState(component, mockReadyToCompleteTestGuideState, false);

      expect(exists('manualCompletionPopover')).toBe(true);
    });

    test('shows no manual completion popover if a step is in progress', async () => {
      const { component, exists } = testBed;

      await updateComponentWithState(component, mockInProgressTestGuideState, false);

      expect(exists('manualCompletionPopoverPanel')).toBe(false);
    });
  });

  describe('Panel component', () => {
    test('should be enabled if a guide is activated', async () => {
      const { exists, component, find } = testBed;

      await updateComponentWithState(component, mockActiveTestGuideState, true);

      expect(exists('guidePanel')).toBe(true);
      expect(exists('guideProgress')).toBe(false);
      expect(find('guidePanelStep').length).toEqual(guidesConfig.testGuide.steps.length);
    });

    test('should show the progress bar if the first step has been completed', async () => {
      const { component, exists } = testBed;

      const mockCompleteTestGuideState: GuideState = {
        ...mockActiveTestGuideState,
        steps: [
          {
            ...mockActiveTestGuideState.steps[0],
            status: 'complete',
          },
          mockActiveTestGuideState.steps[1],
          mockActiveTestGuideState.steps[2],
        ],
      };

      await updateComponentWithState(component, mockCompleteTestGuideState, true);

      expect(exists('guidePanel')).toBe(true);
      expect(exists('guideProgress')).toBe(true);
    });

    test('should show the completed state when all steps has been completed', async () => {
      const { component, exists, find } = testBed;

      const readyToCompleteGuideState: GuideState = {
        guideId: 'testGuide',
        status: 'ready_to_complete',
        isActive: true,
        steps: [
          {
            id: 'step1',
            status: 'complete',
          },
          {
            id: 'step2',
            status: 'complete',
          },
          {
            id: 'step3',
            status: 'complete',
          },
        ],
      };

      await updateComponentWithState(component, readyToCompleteGuideState, true);

      expect(find('guideTitle').text()).toContain('Well done');
      expect(find('guideDescription').text()).toContain(
        `You've completed the Elastic Testing example guide`
      );
      expect(exists('useElasticButton')).toBe(true);
    });

    describe('Steps', () => {
      const clickActiveStepButton = async () => {
        const { component, find } = testBed;

        await act(async () => {
          find('activeStepButton').simulate('click');
        });

        component.update();
      };

      test('can start a step if step has not been started', async () => {
        const { component, find, exists } = testBed;

        await updateComponentWithState(component, mockActiveTestGuideState, true);

        expect(find('activeStepButton').text()).toEqual('Start');

        await clickActiveStepButton();

        expect(exists('guidePanel')).toBe(false);
      });

      test('can continue a step if step is in progress', async () => {
        const { component, find, exists } = testBed;

        await updateComponentWithState(component, mockInProgressTestGuideState, true);

        expect(find('activeStepButton').text()).toEqual('Continue');

        await clickActiveStepButton();

        expect(exists('guidePanel')).toBe(false);
      });

      test('can mark a step "done" if step is ready to complete', async () => {
        const { component, find, exists } = testBed;

        await updateComponentWithState(component, mockReadyToCompleteTestGuideState, true);

        expect(find('activeStepButton').text()).toEqual('Mark done');

        await clickActiveStepButton();

        // The guide panel should remain open after marking a step done
        expect(exists('guidePanel')).toBe(true);
        // Dependent on the Search guide config, which expects another step to start
        expect(find('activeStepButton').text()).toEqual('Start');
      });

      test('should render the step description as a paragraph if it is only one sentence', async () => {
        const { component, find } = testBed;

        const mockSingleSentenceStepDescriptionGuideState: GuideState = {
          guideId: 'testGuide',
          isActive: true,
          status: 'in_progress',
          steps: [
            {
              id: 'step1',
              status: 'complete',
            },
            {
              id: 'step2',
              status: 'complete',
            },
            {
              id: 'step3',
              status: 'in_progress',
            },
          ],
        };

        await updateComponentWithState(
          component,
          mockSingleSentenceStepDescriptionGuideState,
          true
        );

        expect(
          find('guidePanelStepDescription')
            .last()
            .containsMatchingElement(<p>{guidesConfig.testGuide.steps[2].description}</p>)
        ).toBe(true);
      });

      test('should render the step description as an unordered list if it is more than one sentence', async () => {
        const { component, find } = testBed;

        await updateComponentWithState(component, mockActiveTestGuideState, true);

        expect(
          find('guidePanelStepDescription')
            .first()
            .containsMatchingElement(
              <ul>
                {guidesConfig.testGuide.steps[0].descriptionList?.map((description, i) => (
                  <li key={i}>{description}</li>
                ))}
              </ul>
            )
        ).toBe(true);
      });
    });

    describe('Quit guide modal', () => {
      beforeEach(async () => {
        const { component, find, exists } = testBed;

        await act(async () => {
          // Enable the "test" guide
          await apiService.updateGuideState(mockActiveTestGuideState, true);
        });

        component.update();

        await act(async () => {
          find('quitGuideButton').simulate('click');
        });

        component.update();

        expect(exists('quitGuideModal')).toBe(true);
      });

      test('quit a guide', async () => {
        const { component, find, exists } = testBed;

        await act(async () => {
          find('confirmModalConfirmButton').simulate('click');
        });

        component.update();

        expect(exists('quitGuideModal')).toBe(false);

        // TODO check for the correct button behavior once https://github.com/elastic/kibana/issues/141129 is implemented
      });

      test('cancels out of the quit guide confirmation modal', async () => {
        const { component, find, exists } = testBed;

        await act(async () => {
          find('confirmModalCancelButton').simulate('click');
        });

        component.update();

        expect(exists('quitGuideModal')).toBe(false);
        expect(exists('guideButton')).toBe(true);
      });
    });
  });
});
