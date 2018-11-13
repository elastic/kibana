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

import { mount } from 'enzyme';
import React from 'react';
import { NavControl, NavControlSide } from '../';
import { HeaderNavControl } from './header_nav_control';

describe('HeaderNavControl', () => {
  const defaultNavControl = { name: '', order: 1, side: NavControlSide.Right };

  it('calls navControl.render with div node', () => {
    const renderSpy = jest.fn();
    const navControl = { ...defaultNavControl, render: renderSpy } as NavControl;

    mount(<HeaderNavControl navControl={navControl} />);

    expect(renderSpy.mock.calls.length).toEqual(1);

    const [divNode] = renderSpy.mock.calls[0];
    expect(divNode).toBeInstanceOf(HTMLElement);
  });

  it('calls unrender callback when unmounted', () => {
    const unrenderSpy = jest.fn();
    const render = () => unrenderSpy;
    const navControl = { ...defaultNavControl, render } as NavControl;

    const wrapper = mount(<HeaderNavControl navControl={navControl} />);

    wrapper.unmount();
    expect(unrenderSpy.mock.calls.length).toEqual(1);
  });
});
