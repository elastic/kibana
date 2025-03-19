/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { findTestSubject, registerTestBed, TestBed, mountWithIntl } from '@kbn/test-jest-helpers';
import { MemoryRouter } from 'react-router-dom';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { chromeServiceMock, applicationServiceMock, httpServiceMock } from '@kbn/core/public/mocks';
import { ApiService } from '@kbn/guided-onboarding-plugin/public/services/api.service';

import { GettingStarted } from './getting_started';
import { KEY_ENABLE_WELCOME } from '../home';
import { ReactWrapper } from '@kbn/test-jest-helpers/src/testbed/types';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { GuideFiltersProps } from '@kbn/guided-onboarding/src/components/landing_page/guide/guide_filters';

const mockCloud = cloudMock.createSetup();
const mockChrome = chromeServiceMock.createStartContract();
const mockApplication = applicationServiceMock.createStartContract();
const mockHttp = httpServiceMock.createStartContract();
const mockShare = sharePluginMock.createSetupContract();
const mockApiService = new ApiService();
mockApiService.setup(mockHttp, true);

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    cloud: mockCloud,
    chrome: mockChrome,
    application: mockApplication,
    trackUiMetric: jest.fn(),
    share: mockShare,
    guidedOnboardingService: mockApiService,
  }),
}));

describe('getting started', () => {
  let storageItemValue: string | null;
  let testBed: TestBed;
  beforeAll(() => {
    storageItemValue = localStorage.getItem(KEY_ENABLE_WELCOME);
    localStorage.removeItem(KEY_ENABLE_WELCOME);
  });
  afterAll(() => {
    if (storageItemValue) {
      localStorage.setItem(KEY_ENABLE_WELCOME, storageItemValue);
    }
  });

  test('should render getting started component', async () => {
    const component = await shallow(
      <MemoryRouter>
        <GettingStarted />
      </MemoryRouter>
    );

    expect(component.find('GettingStarted').exists()).toBe(true);
  });

  test('displays loading indicator', async () => {
    mockHttp.get.mockImplementationOnce(() => {
      return new Promise((resolve) =>
        setTimeout(() => {
          resolve({ state: [] });
        }, 1000)
      );
    });
    mockApiService.setup(mockHttp, true);

    await act(async () => {
      testBed = registerTestBed(GettingStarted)();
    });
    testBed!.component.update();
    expect(findTestSubject(testBed!.component, 'onboarding--loadingIndicator').exists()).toBe(true);
  });

  test('displays error section', async () => {
    mockHttp.get.mockRejectedValueOnce(new Error('request failed'));
    mockApiService.setup(mockHttp, true);

    await act(async () => {
      testBed = registerTestBed(GettingStarted)();
    });
    testBed!.component.update();
    expect(findTestSubject(testBed!.component, 'onboarding--errorSection').exists()).toBe(true);
  });

  test('skip button should disable home welcome screen', async () => {
    mockHttp.get.mockResolvedValueOnce({ state: [] });
    mockApiService.setup(mockHttp, true);

    await act(async () => {
      testBed = registerTestBed(GettingStarted)();
    });
    testBed!.component.update();

    const skipButton = findTestSubject(testBed!.component, 'onboarding--skipGuideLink');

    await act(async () => {
      await skipButton.simulate('click');
    });
    testBed!.component.update();

    expect(localStorage.getItem(KEY_ENABLE_WELCOME)).toBe('false');
  });

  test('should set default guide filter value if querystring parameter does NOT exist', async () => {
    let component: ReactWrapper;

    await act(async () => {
      component = mountWithIntl(
        <MemoryRouter>
          <GettingStarted />
        </MemoryRouter>
      );
    });

    const guideFilters = component!.find('[data-test-subj="onboarding--guideFilters"]');
    expect((guideFilters.props() as GuideFiltersProps).activeFilter).toBe('search');
  });

  xtest('should set default guide filter value to "all" for classic versions, if querystring parameter does NOT exist', async () => {
    let component: ReactWrapper;

    jest.mock('../../kibana_services', () => ({
      getServices: () => ({
        cloud: mockCloud,
        chrome: mockChrome,
        application: mockApplication,
        share: mockShare,
        guidedOnboardingService: mockApiService,
      }),
    }));

    await act(async () => {
      component = mountWithIntl(
        <MemoryRouter>
          <GettingStarted />
        </MemoryRouter>
      );
    });

    const guideFilters = component!.find('[data-test-subj="onboarding--guideFilters"]');
    expect((guideFilters.props() as GuideFiltersProps).activeFilter).toBe('all');
  });

  test('should auto-select guide filter value based on querystring parameter', async () => {
    const cloudDiscoveryUseCase = 'observability';
    let component: ReactWrapper;

    await act(async () => {
      component = mountWithIntl(
        <MemoryRouter
          initialEntries={[{ pathname: '/', search: `?useCase=${cloudDiscoveryUseCase}` }]}
        >
          <GettingStarted />
        </MemoryRouter>
      );
    });

    const guideFilters = component!.find('[data-test-subj="onboarding--guideFilters"]');
    expect((guideFilters.props() as GuideFiltersProps).activeFilter).toBe(cloudDiscoveryUseCase);
  });
});
