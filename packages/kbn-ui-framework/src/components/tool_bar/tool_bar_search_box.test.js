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
import { render, mount } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../test/required_props';

import { KuiToolBarSearchBox } from './tool_bar_search_box';

const onFilter = sinon.stub();

test('renders KuiToolBarSearchBox', () => {
  const component = <KuiToolBarSearchBox onFilter={onFilter} {...requiredProps} />;
  expect(render(component)).toMatchSnapshot();
});

describe('onFilter', () => {
  test('is called on change event, with the value entered', () => {
    const searchBox = mount(<KuiToolBarSearchBox onFilter={onFilter} {...requiredProps} />);
    onFilter.resetHistory();
    const event = { target: { value: 'a' } };
    searchBox.find('input').simulate('change', event);
    sinon.assert.calledWith(onFilter, 'a');
  });
});

describe('filter', () => {
  test('initializes search box value', () => {
    const component = <KuiToolBarSearchBox onFilter={onFilter} filter="My Query" />;
    expect(render(component)).toMatchSnapshot();
  });
});

describe('placeholder', () => {
  test('initializes search box placeholder', () => {
    const component = <KuiToolBarSearchBox onFilter={onFilter} placeholder="Filter items..." />;
    expect(render(component)).toMatchSnapshot();
  });
});
