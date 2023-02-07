/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GuideCardSolutions, GuideCardsProps } from './components/landing_page/guide_cards';
import { GuideCardConstants } from './components/landing_page/guide_cards.constants';
import { GuideId, GuideStatus, GuideStepIds, StepStatus } from '..';

const guideId: GuideId = 'testGuide';
const status: GuideStatus = 'not_started';
const stepStatus: StepStatus = 'inactive';
const testGuideId: GuideStepIds = 'step1';

export const activateGuideMock: GuideCardsProps & { card: GuideCardConstants } = {
  activateGuideDefaultState: jest.fn(),
  navigateToApp: jest.fn(),
  activeFilter: 'all',
  guidesState: [
    {
      guideId,
      status,
      isActive: false,
      steps: [
        {
          id: testGuideId,
          status: stepStatus,
        },
      ],
    },
  ],
  card: {
    solution: 'search' as GuideCardSolutions,
    title: 'test_title',
    guideId: 'testGuide',
    telemetryId: 'test_telemetry_id',
    order: 1,
  },
};

export const navigateToAppGuideMock: GuideCardsProps & { card: GuideCardConstants } = {
  ...activateGuideMock,
  card: {
    solution: 'search' as GuideCardSolutions,
    title: 'test_title',
    telemetryId: 'test_telemetry_id',
    order: 1,
    navigateTo: {
      appId: 'test_appId',
      path: 'path/to/app',
    },
  },
};
