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

import { guidesConfig } from '../../common/guides_config';
import { GuideState } from '../../common/types';
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

describe('GuidePanel', () => {
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

  test('it should be disabled in there is no active guide', async () => {
    const { exists } = testBed;
    expect(exists('disabledGuideButton')).toBe(true);
    expect(exists('guideButton')).toBe(false);
    expect(exists('guidePanel')).toBe(false);
  });

  test('it should be enabled if there is an active guide', async () => {
    const { exists, component, find } = testBed;

    await act(async () => {
      // Enable the "search" guide
      await apiService.updateGuideState(mockActiveSearchGuideState, true);
    });

    component.update();

    expect(exists('disabledGuideButton')).toBe(false);
    expect(exists('guideButton')).toBe(true);
    expect(exists('guidePanel')).toBe(true);
    expect(find('guidePanelStep').length).toEqual(guidesConfig.search.steps.length);
  });
});
