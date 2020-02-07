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
import { TopNavMenuItem } from './top_nav_menu_item';
import { TopNavMenuData } from './top_nav_menu_data';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

describe('TopNavMenu', () => {
  it('Should render and click an item', () => {
    const data: TopNavMenuData = {
      id: 'test',
      label: 'test',
      run: jest.fn(),
    };

    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    expect(component.prop('isDisabled')).toEqual(false);

    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toBeCalledTimes(1);
    expect(data.run).toHaveBeenCalledWith(event.currentTarget);

    component.simulate('click', event);
    expect(data.run).toBeCalledTimes(2);
  });

  it('Should render item with all attributes', () => {
    const data: TopNavMenuData = {
      id: 'test',
      label: 'test',
      description: 'description',
      testId: 'test-class-name',
      disableButton: false,
      run: jest.fn(),
    };

    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    expect(component.prop('isDisabled')).toEqual(false);

    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toHaveBeenCalled();
  });

  it('Should render disabled item and it shouldnt be clickable', () => {
    const data: TopNavMenuData = {
      id: 'test',
      label: 'test',
      disableButton: true,
      run: jest.fn(),
    };

    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    expect(component.prop('isDisabled')).toEqual(true);

    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toHaveBeenCalledTimes(0);
  });

  it('Should render item with disable function and it shouldnt be clickable', () => {
    const data: TopNavMenuData = {
      id: 'test',
      label: 'test',
      disableButton: () => true,
      run: jest.fn(),
    };

    const component = shallowWithIntl(<TopNavMenuItem {...data} />);
    expect(component.prop('isDisabled')).toEqual(true);

    const event = { currentTarget: { value: 'a' } };
    component.simulate('click', event);
    expect(data.run).toHaveBeenCalledTimes(0);
  });
});
