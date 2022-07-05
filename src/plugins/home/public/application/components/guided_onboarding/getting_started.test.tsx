/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { GettingStarted } from './getting_started';

jest.mock('../../kibana_services', () => {
  const { chromeServiceMock, applicationServiceMock } =
    jest.requireActual('@kbn/core/public/mocks');
  return {
    getServices: () => ({
      chrome: chromeServiceMock.createStartContract(),
      application: applicationServiceMock.createStartContract(),
      trackUiMetric: jest.fn(),
    }),
  };
});
describe('getting started', () => {
  test('should render getting started component', async () => {
    const component = await shallow(<GettingStarted />);

    expect(component).toMatchSnapshot();
  });
});
