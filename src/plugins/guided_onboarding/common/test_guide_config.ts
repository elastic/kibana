/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GuideId } from '@kbn/guided-onboarding';
import type { GuideConfig } from './types';

export const testGuideId: GuideId = 'testGuide';
export const testGuideConfig: GuideConfig = {
  title: 'Test guide for development',
  description: `This guide is used to test the guided onboarding UI while in development and to run automated tests for the API and UI components.`,
  guideName: 'Testing example',
  completedGuideRedirectLocation: {
    appID: 'guidedOnboardingExample',
    path: '/',
  },
  docs: {
    text: 'Testing example docs',
    url: 'example.com',
  },
  steps: [
    {
      id: 'step1',
      title: 'Step 1 (completed via an API request)',
      descriptionList: [
        `This step is directly completed by clicking the button that uses the API function 'completeGuideStep`,
        'Navigate to /guidedOnboardingExample/stepOne to complete the step.',
      ],
      location: {
        appID: 'guidedOnboardingExample',
        path: 'stepOne',
      },
      integration: 'testIntegration',
    },
    {
      id: 'step2',
      title: 'Step 2 (manual completion after navigation)',
      descriptionList: [
        'This step is set to ready_to_complete on page navigation.',
        'After that click the popover on the guide button in the header and mark the step done',
      ],
      location: {
        appID: 'guidedOnboardingExample',
        path: 'stepTwo',
      },
      manualCompletion: {
        title: 'Manual completion step title',
        description:
          'Mark the step complete by opening the panel and clicking the button "Mark done"',
        readyToCompleteOnNavigation: true,
      },
    },
    {
      id: 'step3',
      title: 'Step 3 (manual completion after click)',
      description:
        'This step is completed by clicking a button on the page and then clicking the popover on the guide button in the header and marking the step done',
      manualCompletion: {
        title: 'Manual completion step title',
        description:
          'Mark the step complete by opening the panel and clicking the button "Mark done"',
      },
      location: {
        appID: 'guidedOnboardingExample',
        path: 'stepThree',
      },
    },
  ],
};
