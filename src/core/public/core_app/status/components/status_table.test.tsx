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

import React from 'react';
import { shallow } from 'enzyme';
import { StatusTable } from './status_table';

const state = {
  id: 'green',
  uiColor: 'secondary',
  message: 'Ready',
  title: 'green',
};

describe('StatusTable', () => {
  it('renders when statuses is provided', () => {
    const component = shallow(<StatusTable statuses={[{ id: 'plugin:1', state }]} />);
    expect(component).toMatchSnapshot();
  });

  it('renders when statuses is not provided', () => {
    const component = shallow(<StatusTable />);
    expect(component.isEmptyRender()).toBe(true);
  });
});
