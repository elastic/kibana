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

import { shallow } from 'enzyme';
import React from 'react';
import * as Rx from 'rxjs';
import { GlobalBannerList } from './global_banner_list';

it('renders nothing without banners', () => {
  const component = shallow(<GlobalBannerList banners$={Rx.EMPTY} />);
  expect(component).toMatchInlineSnapshot(`""`);
});

it('renders banners in the order received', () => {
  const component = shallow(
    <GlobalBannerList
      banners$={Rx.of([
        {
          id: '123',
          component: <div>first</div>,
          priority: Math.random(),
        },
        {
          id: '456',
          component: <div>second</div>,
          priority: Math.random(),
        },
      ])}
    />
  );
  expect(component).toMatchInlineSnapshot(`
<div
  className="globalBanner__list"
>
  <div
    className="globalBanner__item"
    key="123"
  >
    <div>
      first
    </div>
  </div>
  <div
    className="globalBanner__item"
    key="456"
  >
    <div>
      second
    </div>
  </div>
</div>
`);
});
