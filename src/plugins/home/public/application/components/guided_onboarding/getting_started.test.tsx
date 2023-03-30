/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { findTestSubject, registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { chromeServiceMock, applicationServiceMock, httpServiceMock } from '@kbn/core/public/mocks';
import { ApiService } from '@kbn/guided-onboarding-plugin/public/services/api.service';

import { GettingStarted } from './getting_started';
import { KEY_ENABLE_WELCOME } from '../home';

const mockCloud = cloudMock.createSetup();
const mockChrome = chromeServiceMock.createStartContract();
const mockApplication = applicationServiceMock.createStartContract();
const mockHttp = httpServiceMock.createStartContract();
const mockApiService = new ApiService();
mockApiService.setup(mockHttp, true);

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    cloud: mockCloud,
    chrome: mockChrome,
    application: mockApplication,
    trackUiMetric: jest.fn(),
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
    const component = await shallow(<GettingStarted />);

    expect(component).toMatchSnapshot();
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
});
