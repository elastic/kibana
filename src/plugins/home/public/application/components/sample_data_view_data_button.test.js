/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SampleDataViewDataButton } from './sample_data_view_data_button';

jest.mock('../kibana_services', () => ({
  getServices: () => ({
    addBasePath: (path) => `root${path}`,
  }),
}));

test('should render simple button when appLinks is empty', () => {
  const component = shallow(
    <SampleDataViewDataButton
      id="ecommerce"
      name="Sample eCommerce orders"
      overviewDashboard="722b74f0-b882-11e8-a6d9-e546fe2bba5f"
      appLinks={[]}
    />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('should render popover when appLinks is not empty', () => {
  const appLinks = [
    {
      path: 'app/myAppPath',
      label: 'myAppLabel',
      icon: 'logoKibana',
    },
  ];

  const component = shallow(
    <SampleDataViewDataButton
      id="ecommerce"
      name="Sample eCommerce orders"
      overviewDashboard="722b74f0-b882-11e8-a6d9-e546fe2bba5f"
      appLinks={appLinks}
    />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
