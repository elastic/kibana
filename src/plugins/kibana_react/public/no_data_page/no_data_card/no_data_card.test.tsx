/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { NoDataCard } from './no_data_card';

jest.mock('../../context', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: { capabilities: { advancedSettings: { show: true, save: true } } },
      notifications: { toast: { addSuccess: jest.fn() } },
    },
  }),
}));

jest.mock('../../ui_settings', () => ({
  useUiSetting$: jest.fn().mockReturnValue(['path-to-default-route', jest.fn()]),
}));

afterEach(() => jest.clearAllMocks());

describe('ElasticAgentCard', () => {
  test('renders', () => {
    const component = shallow(<NoDataCard />);
    expect(component).toMatchSnapshot();
  });
});
