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
import type { HttpSetup } from '@kbn/core/public';
import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';

import type { PluginState } from '../../common/types';
import { guidesConfig } from '../constants/guides_config';
import { apiService } from '../services/api';
import type { GuidedOnboardingApi } from '../types';
import {
  testGuideStep1ActiveState,
  testGuideStep1InProgressState,
  testGuideStep2InProgressState,
  testGuideStep2ReadyToCompleteState,
  testGuideStep3ActiveState,
  readyToCompleteGuideState,
  mockPluginStateNotStarted,
} from '../services/api.mocks';
import { GuidePanel } from './guide_panel';

const applicationMock = applicationServiceMock.createStartContract();

const setupComponentWithPluginStateMock = async (
  httpClient: jest.Mocked<HttpSetup>,
  pluginState: PluginState
) => {
  httpClient.get.mockResolvedValue({
    pluginState,
  });
  apiService.setup(httpClient, true);
  return await setupGuidePanelComponent(apiService);
};

const setupGuidePanelComponent = async (api: GuidedOnboardingApi) => {
  let testBed: TestBed;
  const GuidePanelComponent = () => <GuidePanel application={applicationMock} api={api} />;
  await act(async () => {
    testBed = registerTestBed(GuidePanelComponent)();
  });

  testBed!.component.update();
  return testBed!;
};

describe('Guided setup', () => {
  let httpClient: jest.Mocked<HttpSetup>;
  let testBed: TestBed;

  beforeEach(async () => {
    httpClient = httpServiceMock.createStartContract({ basePath: '/base/path' });
    // Default state is not started
    testBed = await setupComponentWithPluginStateMock(httpClient, mockPluginStateNotStarted);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Button component', () => {
    describe('when a guide is active', () => {
      it('button is enabled', async () => {
        const { exists, find } = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep1ActiveState,
        });
        expect(exists('guideButton')).toBe(true);
        expect(find('guideButton').text()).toEqual('Setup guide');
        expect(exists('guideButtonRedirect')).toBe(false);
      });

      test('button shows the step number in the button label if a step is active', async () => {
        const { exists, find } = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep1InProgressState,
        });

        expect(exists('guideButton')).toBe(true);
        expect(find('guideButton').text()).toEqual('Setup guide: step 1');
        expect(exists('guideButtonRedirect')).toBe(false);
      });

      test('shows the step number in the button label if a step is ready to complete', async () => {
        const { exists, find } = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep2ReadyToCompleteState,
        });

        expect(exists('guideButton')).toBe(true);
        expect(find('guideButton').text()).toEqual('Setup guide: step 2');
        expect(exists('guideButtonRedirect')).toBe(false);
      });

      test('shows the manual completion popover if a step is ready to complete', async () => {
        const { exists } = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep2ReadyToCompleteState,
        });

        expect(exists('manualCompletionPopover')).toBe(true);
      });

      test('shows no manual completion popover if a step is in progress', async () => {
        const { exists } = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep1InProgressState,
        });

        expect(exists('manualCompletionPopoverPanel')).toBe(false);
      });

      it('shows the button if after the active period', async () => {
        const { exists, find } = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: false,
          activeGuide: testGuideStep1ActiveState,
        });
        expect(exists('guideButton')).toBe(true);
        expect(find('guideButton').text()).toEqual('Setup guide');
        expect(exists('guideButtonRedirect')).toBe(false);
      });
    });

    describe('when no guide is active', () => {
      describe('when in active period', () => {
        // mock state is by default { status: 'not_started', isActivePeriod: true }
        test('shows redirect button when no guide has been started yet', () => {
          const { exists } = testBed;
          expect(exists('guideButtonRedirect')).toBe(true);
          expect(exists('guideButton')).toBe(false);
        });

        test('shows redirect button when a user skipped on the landing page', async () => {
          const { exists } = await setupComponentWithPluginStateMock(httpClient, {
            status: 'skipped',
            isActivePeriod: true,
          });

          expect(exists('guideButtonRedirect')).toBe(true);
          expect(exists('guideButton')).toBe(false);
        });

        test('hides redirect button when a user quit the guide', async () => {
          const { exists } = await setupComponentWithPluginStateMock(httpClient, {
            status: 'quit',
            isActivePeriod: true,
          });

          expect(exists('guideButtonRedirect')).toBe(false);
          expect(exists('guideButton')).toBe(false);
        });

        test('hides the button if the user completed a guide', async () => {
          const { exists } = await setupComponentWithPluginStateMock(httpClient, {
            status: 'complete',
            isActivePeriod: true,
          });

          expect(exists('guideButtonRedirect')).toBe(false);
          expect(exists('guideButton')).toBe(false);
        });
      });

      describe('when not in active period', () => {
        test('hides the button if no guide has been started yet', async () => {
          const { exists } = await setupComponentWithPluginStateMock(httpClient, {
            status: 'not_started',
            isActivePeriod: false,
          });
          expect(exists('guideButtonRedirect')).toBe(false);
          expect(exists('guideButton')).toBe(false);
        });

        test('hides the button if a user quit the guide', async () => {
          const { exists } = await setupComponentWithPluginStateMock(httpClient, {
            status: 'quit',
            isActivePeriod: false,
          });
          expect(exists('guideButtonRedirect')).toBe(false);
          expect(exists('guideButton')).toBe(false);
        });

        test('hides the button when a user skipped on the landing page', async () => {
          const { exists } = await setupComponentWithPluginStateMock(httpClient, {
            status: 'skipped',
            isActivePeriod: false,
          });
          expect(exists('guideButtonRedirect')).toBe(false);
          expect(exists('guideButton')).toBe(false);
        });

        test('hides the button if the user completed a guide', async () => {
          const { exists } = await setupComponentWithPluginStateMock(httpClient, {
            status: 'complete',
            isActivePeriod: false,
          });
          expect(exists('guideButtonRedirect')).toBe(false);
          expect(exists('guideButton')).toBe(false);
        });
      });
    });
  });

  describe('Panel component', () => {
    test('if a guide is active, the button click opens the panel', async () => {
      const { exists, find, component } = await setupComponentWithPluginStateMock(httpClient, {
        status: 'in_progress',
        isActivePeriod: true,
        activeGuide: testGuideStep1ActiveState,
      });
      find('guideButton').simulate('click');
      component.update();

      expect(exists('guidePanel')).toBe(true);
      expect(exists('guideProgress')).toBe(false);
      expect(find('guidePanelStep').length).toEqual(guidesConfig.testGuide.steps.length);
    });

    test('shows the progress bar if the first step has been completed', async () => {
      const { exists, find, component } = await setupComponentWithPluginStateMock(httpClient, {
        status: 'in_progress',
        isActivePeriod: true,
        activeGuide: testGuideStep2InProgressState,
      });
      find('guideButton').simulate('click');
      component.update();

      expect(exists('guidePanel')).toBe(true);
      expect(exists('guideProgress')).toBe(true);
    });

    test('shows the completed state when all steps has been completed', async () => {
      const { exists, find, component } = await setupComponentWithPluginStateMock(httpClient, {
        status: 'in_progress',
        isActivePeriod: true,
        activeGuide: { ...readyToCompleteGuideState, status: 'ready_to_complete' },
      });
      find('guideButton').simulate('click');
      component.update();

      expect(find('guideTitle').text()).toContain('Well done');
      expect(find('guideDescription').text()).toContain(
        `You've completed the Elastic Testing example guide`
      );
      expect(exists('onboarding--completeGuideButton--testGuide')).toBe(true);
    });

    test(`doesn't show the completed state when the last step is not marked as complete`, async () => {
      const { exists, find, component } = await setupComponentWithPluginStateMock(httpClient, {
        status: 'in_progress',
        isActivePeriod: true,
        activeGuide: {
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
              status: 'ready_to_complete',
            },
          ],
        },
      });
      find('guideButton').simulate('click');
      component.update();

      expect(find('guideTitle').text()).not.toContain('Well done');
      expect(find('guideDescription').text()).not.toContain(
        `You've completed the Elastic Testing example guide`
      );
      expect(exists('useElasticButton')).toBe(false);
    });

    describe('Steps', () => {
      const clickStepButton = async ({
        telemetryGuideId,
        stepNumber,
      }: {
        telemetryGuideId: string;
        stepNumber: number;
      }) => {
        const { component, find } = testBed;

        await act(async () => {
          find(`onboarding--stepButton--${telemetryGuideId}--step${stepNumber}`).simulate('click');
        });

        component.update();
      };

      test('can start a step if step has not been started', async () => {
        httpClient.put.mockResolvedValueOnce({
          pluginState: {
            status: 'in_progress',
            isActivePeriod: true,
            activeGuide: testGuideStep1InProgressState,
          },
        });
        testBed = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep1ActiveState,
        });
        const { exists, find, component } = testBed;
        find('guideButton').simulate('click');
        component.update();

        expect(find('onboarding--stepButton--testGuide--step1').text()).toEqual('Start');

        await clickStepButton({ telemetryGuideId: 'testGuide', stepNumber: 1 });

        expect(exists('guidePanel')).toBe(false);
      });

      test('can continue a step if step is in progress', async () => {
        httpClient.put.mockResolvedValueOnce({
          pluginState: {
            status: 'in_progress',
            isActivePeriod: true,
            activeGuide: testGuideStep1InProgressState,
          },
        });
        testBed = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep1InProgressState,
        });
        const { exists, find, component } = testBed;
        find('guideButton').simulate('click');
        component.update();

        expect(find('onboarding--stepButton--testGuide--step1').text()).toEqual('Continue');

        await clickStepButton({ telemetryGuideId: 'testGuide', stepNumber: 1 });

        expect(exists('guidePanel')).toBe(false);
      });

      test('can mark a step "done" if step is ready to complete', async () => {
        httpClient.put.mockResolvedValueOnce({
          pluginState: {
            status: 'in_progress',
            isActivePeriod: true,
            activeGuide: testGuideStep3ActiveState,
          },
        });
        testBed = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep2ReadyToCompleteState,
        });
        const { exists, find, component } = testBed;
        find('guideButton').simulate('click');
        component.update();

        expect(find('onboarding--stepButton--testGuide--step2').text()).toEqual('Mark done');

        await clickStepButton({ telemetryGuideId: 'testGuide', stepNumber: 2 });

        // The guide panel should remain open after marking a step done
        expect(exists('guidePanel')).toBe(true);
        // Dependent on the Test guide config, which expects step 3 to start
        expect(find('onboarding--stepButton--testGuide--step3').text()).toEqual('Start');
      });

      test('renders the step description as a paragraph', async () => {
        const { find, component } = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep3ActiveState,
        });
        find('guideButton').simulate('click');
        component.update();

        expect(
          find('guidePanelStepDescription')
            .last()
            .containsMatchingElement(<p>{guidesConfig.testGuide.steps[2].description}</p>)
        ).toBe(true);
      });

      test('renders the step description list as an unordered list', async () => {
        const { find, component } = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep1ActiveState,
        });
        find('guideButton').simulate('click');
        component.update();

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
        testBed = await setupComponentWithPluginStateMock(httpClient, {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep1ActiveState,
        });

        const { find, component, exists } = testBed;
        find('guideButton').simulate('click');
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
          find('onboarding--quitGuideButton--testGuide').simulate('click');
        });

        component.update();

        expect(exists('onboarding--quitGuideModal')).toBe(false);
      });

      test('cancels out of the quit guide confirmation modal', async () => {
        httpClient.put.mockResolvedValueOnce({
          pluginState: {
            status: 'quit',
            isActivePeriod: true,
          },
        });
        const { component, find, exists } = testBed;

        await act(async () => {
          find('onboarding--cancelQuitGuideButton--testGuide').simulate('click');
        });

        component.update();

        expect(exists('onboarding--quitGuideModal')).toBe(false);
        expect(exists('guideButton')).toBe(true);
      });
    });
  });
});
