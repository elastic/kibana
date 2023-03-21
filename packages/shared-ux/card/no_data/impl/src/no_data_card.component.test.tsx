/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { NoDataCard } from './no_data_card.component';

describe('NoDataCardComponent', () => {
  test('renders', () => {
    const component = shallow(<NoDataCard canAccessFleet={true} />);
    expect(component).toMatchSnapshot();
  });

  test('renders with canAccessFleet false', () => {
    const component = shallow(<NoDataCard canAccessFleet={false} />);
    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('button', () => {
      const component = shallow(<NoDataCard button="Button" canAccessFleet={true} />);
      expect(component).toMatchSnapshot();
    });

    test('href', () => {
      const component = shallow(<NoDataCard canAccessFleet={true} href={'some path'} />);
      expect(component).toMatchSnapshot();
    });
  });
});
