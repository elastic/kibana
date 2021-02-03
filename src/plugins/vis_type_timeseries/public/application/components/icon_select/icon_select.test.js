/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
