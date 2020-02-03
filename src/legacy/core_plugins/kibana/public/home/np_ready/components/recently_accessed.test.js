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
import { RecentlyAccessed, NUM_LONG_LINKS } from './recently_accessed';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

const createRecentlyAccessed = length => {
  const recentlyAccessed = [];
  let i = 0;
  while (recentlyAccessed.length < length) {
    recentlyAccessed.push({
      label: `label${recentlyAccessed.length}`,
      link: `link${recentlyAccessed.length}`,
      id: `${i++}`,
    });
  }
  return recentlyAccessed;
};

test('render', () => {
  const component = shallow(<RecentlyAccessed recentlyAccessed={createRecentlyAccessed(2)} />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('more popover', () => {
  test('should not be rendered when recently accessed list size is less than NUM_LONG_LINKS', () => {
    const component = mountWithIntl(
      <RecentlyAccessed recentlyAccessed={createRecentlyAccessed(NUM_LONG_LINKS - 1)} />
    );

    const moreRecentlyAccessed = findTestSubject(component, 'openMoreRecentlyAccessedPopover');
    expect(moreRecentlyAccessed.length).toBe(0);
  });

  test('should not be rendered when recently accessed list size is NUM_LONG_LINKS', () => {
    const component = mountWithIntl(
      <RecentlyAccessed recentlyAccessed={createRecentlyAccessed(NUM_LONG_LINKS)} />
    );

    const moreRecentlyAccessed = findTestSubject(component, 'openMoreRecentlyAccessedPopover');
    expect(moreRecentlyAccessed.length).toBe(0);
  });

  describe('recently accessed list size exceeds NUM_LONG_LINKS', () => {
    test('should be rendered', () => {
      const component = mountWithIntl(
        <RecentlyAccessed recentlyAccessed={createRecentlyAccessed(NUM_LONG_LINKS + 1)} />
      );

      const moreRecentlyAccessed = findTestSubject(component, 'openMoreRecentlyAccessedPopover');
      expect(moreRecentlyAccessed.length).toBe(1);
    });

    test('should only contain overflow recently accessed items when opened', () => {
      const numberOfRecentlyAccessed = NUM_LONG_LINKS + 2;
      const component = mountWithIntl(
        <RecentlyAccessed recentlyAccessed={createRecentlyAccessed(numberOfRecentlyAccessed)} />
      );

      const moreRecentlyAccessed = findTestSubject(component, 'openMoreRecentlyAccessedPopover');
      moreRecentlyAccessed.simulate('click');

      let i = 0;
      while (i < numberOfRecentlyAccessed) {
        const item = findTestSubject(component, `moreRecentlyAccessedItem${i}`);
        if (i < NUM_LONG_LINKS) {
          expect(item.length).toBe(0);
        } else {
          expect(item.length).toBe(1);
        }
        i++;
      }
    });
  });
});
