/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper, shallow } from 'enzyme';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import { GettingStarted } from './getting_started';
import { KEY_ENABLE_WELCOME } from '../home';
import { act } from 'react-dom/test-utils';

const mockFetchGuides = jest.fn();

jest.mock('../../kibana_services', () => {
  const { chromeServiceMock, applicationServiceMock } =
    jest.requireActual('@kbn/core/public/mocks');
  const { uiSettingsServiceMock } = jest.requireActual('@kbn/core-ui-settings-browser-mocks');
  const { cloudMock } = jest.requireActual('@kbn/cloud-plugin/public/mocks');

  const uiSettingsMock = uiSettingsServiceMock.createSetupContract();
  uiSettingsMock.get.mockReturnValue(false);
  return {
    getServices: () => ({
      cloud: cloudMock.createSetup(),
      chrome: chromeServiceMock.createStartContract(),
      application: applicationServiceMock.createStartContract(),
      trackUiMetric: jest.fn(),
      uiSettings: uiSettingsMock,
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
      guidedOnboardingService: {
        fetchAllGuidesState: mockFetchGuides,
        skipGuidedOnboarding: jest.fn(),
      },
    }),
  };
});
describe('getting started', () => {
  let storageItemValue: string | null;
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
    mockFetchGuides.mockImplementationOnce(() => {
      return new Promise((resolve) =>
        setTimeout(() => {
          resolve({ state: [] });
        })
      );
    });

    let component: ReactWrapper;
    await act(async () => {
      component = mountWithIntl(<GettingStarted />);
    });
    component!.update();
    expect(findTestSubject(component!, 'onboarding--loadingIndicator').exists()).toBe(true);
  });

  test('displays error section', async () => {
    mockFetchGuides.mockRejectedValueOnce(new Error('request failed'));

    let component: ReactWrapper;
    await act(async () => {
      component = mountWithIntl(<GettingStarted />);
    });
    component!.update();
    expect(findTestSubject(component!, 'onboarding--errorSection').exists()).toBe(true);
  });

  test('skip button should disable home welcome screen', async () => {
    mockFetchGuides.mockResolvedValueOnce({ state: [] });
    let component: ReactWrapper;
    await act(async () => {
      component = mountWithIntl(<GettingStarted />);
    });
    const skipButton = findTestSubject(component!, 'onboarding--skipGuideLink');

    await act(async () => {
      await skipButton.simulate('click');
    });

    component!.update();

    expect(localStorage.getItem(KEY_ENABLE_WELCOME)).toBe('false');
  });
});
