/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { AddData } from './add_data';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ApplicationStart } from 'kibana/public';

jest.mock('../app_navigation_handler', () => {
  return {
    createAppNavigationHandler: jest.fn(() => () => {}),
  };
});

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    trackUiMetric: jest.fn(),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const applicationStartMock = {
  capabilities: { navLinks: { integrations: true } },
} as unknown as ApplicationStart;

const addBasePathMock = jest.fn((path: string) => (path ? path : 'path'));

describe('AddData', () => {
  test('render', () => {
    const component = shallowWithIntl(
      <AddData
        addBasePath={addBasePathMock}
        application={applicationStartMock}
        isDarkMode={false}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
