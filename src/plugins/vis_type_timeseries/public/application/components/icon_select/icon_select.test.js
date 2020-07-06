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
import { IconSelect, IconView, ICONS } from './icon_select';

describe('src/legacy/core_plugins/metrics/public/components/icon_select/icon_select.js', () => {
  describe('<IconSelect />', () => {
    test('should render and match a snapshot', () => {
      const wrapper = shallow(<IconSelect onChange={jest.fn()} value={ICONS[1].value} />);

      expect(wrapper).toMatchSnapshot();
    });

    test('should put the default value if the passed one does not match with icons collection', () => {
      const wrapper = shallow(<IconSelect onChange={jest.fn()} value="unknown" />);

      expect(wrapper.prop('selectedOptions')).toEqual([ICONS[0]]);
    });
  });

  describe('<IconView />', () => {
    test('should render and match a snapshot', () => {
      const wrapper = shallow(<IconView label="Comment" value="fa-comment" />);

      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('ICONS', () => {
    test('should match and save an icons collection snapshot', () => {
      expect(ICONS).toMatchSnapshot();
    });
  });
});
