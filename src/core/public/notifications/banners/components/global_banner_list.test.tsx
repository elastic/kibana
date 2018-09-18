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
import { GlobalBannerList } from './global_banner_list';

it('renders nothing without banners', () => {
  const component = shallow(<GlobalBannerList banners={[]} />);
  expect(component).toMatchInlineSnapshot(`
<div
  className="globalBanner__list"
/>
`);
});

it('renders banners in descending priority order', () => {
  expect(
    shallow(
      <GlobalBannerList
        banners={
          [
            {
              id: '123',
              priority: 123,
            },
            {
              id: '456',
              priority: 456,
            },
          ] as any
        }
      />
    )
  ).toMatchInlineSnapshot(`
<div
  className="globalBanner__list"
>
  <GlobalBannerItem
    banner={
      Object {
        "id": "456",
        "priority": 456,
      }
    }
    key="456"
  />
  <GlobalBannerItem
    banner={
      Object {
        "id": "123",
        "priority": 123,
      }
    }
    key="123"
  />
</div>
`);

  expect(
    shallow(
      <GlobalBannerList
        banners={
          [
            {
              id: '456',
              priority: 456,
            },
            {
              id: '123',
              priority: 123,
            },
          ] as any
        }
      />
    )
  ).toMatchInlineSnapshot(`
<div
  className="globalBanner__list"
>
  <GlobalBannerItem
    banner={
      Object {
        "id": "456",
        "priority": 456,
      }
    }
    key="456"
  />
  <GlobalBannerItem
    banner={
      Object {
        "id": "123",
        "priority": 123,
      }
    }
    key="123"
  />
</div>
`);
});
