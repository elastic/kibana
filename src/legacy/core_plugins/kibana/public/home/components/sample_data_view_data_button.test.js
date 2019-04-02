/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('ui/chrome', () => {
  return {
    addBasePath: (path) => {
      return `root${path}`;
    },
  };
});

import React from 'react';
import { shallow } from 'enzyme';

import { SampleDataViewDataButton } from './sample_data_view_data_button';

test('should render simple button when appLinks is empty', () => {
  const component = shallow(<SampleDataViewDataButton
    id="ecommerce"
    name="Sample eCommerce orders"
    overviewDashboard="722b74f0-b882-11e8-a6d9-e546fe2bba5f"
    appLinks={[]}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('should render popover when appLinks is not empty', () => {
  const appLinks = [
    {
      path: 'app/myAppPath',
      label: 'myAppLabel',
      icon: 'logoKibana'
    }
  ];

  const component = shallow(<SampleDataViewDataButton
    id="ecommerce"
    name="Sample eCommerce orders"
    overviewDashboard="722b74f0-b882-11e8-a6d9-e546fe2bba5f"
    appLinks={appLinks}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
