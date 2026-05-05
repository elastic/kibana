/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AddData } from './add_data';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import type { ApplicationStart } from '@kbn/core/public';

jest.mock('../app_navigation_handler', () => {
  return {
    createAppNavigationHandler: jest.fn(() => () => {}),
  };
});

jest.mock('../../kibana_services', () => ({
  getServices: jest.fn().mockReturnValue({
    trackUiMetric: jest.fn(),
    addDataService: {
      getCloudConnectStatusHook: jest.fn(() => () => ({
        isLoading: false,
        isCloudConnected: false,
      })),
    },
    notifications: {
      tours: { isEnabled: jest.fn().mockReturnValue(true) },
    },
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const applicationStartMock = {
  capabilities: { navLinks: { integrations: true } },
} as unknown as ApplicationStart;

const addBasePathMock = jest.fn((path: string) => (path ? path : 'path'));

const applicationWithCloudConnectMock = {
  capabilities: { navLinks: { integrations: true }, cloudConnect: { show: true } },
} as unknown as ApplicationStart;

describe('AddData', () => {
  test('render', () => {
    const component = shallowWithIntl(
      <AddData
        addBasePath={addBasePathMock}
        application={applicationStartMock}
        isDarkMode={false}
        isCloudEnabled={false}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('hides SetupCloudConnect when hideAnnouncements is true', () => {
    jest
      .requireMock('../../kibana_services')
      .getServices()
      .notifications.tours.isEnabled.mockReturnValueOnce(false);
    const component = shallowWithIntl(
      <AddData
        addBasePath={addBasePathMock}
        application={applicationWithCloudConnectMock}
        isDarkMode={false}
        isCloudEnabled={false}
      />
    );
    expect(component.find('SetupCloudConnect')).toHaveLength(0);
    expect(component.find('MoveData')).toHaveLength(1);
  });
});
