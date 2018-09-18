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
import { GlobalBannerItem } from './global_banner_item';

it('calls banner render function with div element', () => {
  const render = jest.fn();

  mount(
    <GlobalBannerItem
      banner={{
        id: '123',
        priority: 123,
        render,
      }}
    />
  );

  expect(render.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    <div
      class="globalBanner__item"
    />,
  ],
]
`);
});

it('calls unrender function before new render function when replaced, calls unrender when unmounted', () => {
  expect.assertions(4);

  const unrender = jest.fn();
  const render = jest.fn(() => unrender);

  const unrender2 = jest.fn();
  const render2 = jest.fn(() => {
    expect(unrender).toHaveBeenCalledTimes(1);
    return unrender2;
  });

  const component = mount(
    <GlobalBannerItem
      banner={{
        id: '123',
        priority: 123,
        render,
      }}
    />
  );

  component.setProps({
    banner: {
      id: '123',
      priority: 123,
      render: render2,
    },
  });

  expect(render2).toHaveBeenCalled();
  expect(unrender2).not.toHaveBeenCalled();

  component.unmount();

  expect(unrender2).toHaveBeenCalled();
});
