/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ToolbarButton, POSITIONS, WEIGHTS, TOOLBAR_BUTTON_SIZES } from './toolbar_button';

const noop = () => {};

describe('sizes', () => {
  TOOLBAR_BUTTON_SIZES.forEach((size) => {
    test(`${size} is applied`, () => {
      const component = shallow(<ToolbarButton onClick={noop} size={size} />);
      expect(component).toMatchSnapshot();
    });
  });
});

describe('positions', () => {
  POSITIONS.forEach((position) => {
    test(`${position} is applied`, () => {
      const component = shallow(<ToolbarButton onClick={noop} groupPosition={position} />);
      expect(component).toMatchSnapshot();
    });
  });
});

describe('font weights', () => {
  WEIGHTS.forEach((weight) => {
    test(`${weight} is applied`, () => {
      const component = shallow(<ToolbarButton onClick={noop} fontWeight={weight} />);
      expect(component).toMatchSnapshot();
    });
  });
});

describe('hasArrow', () => {
  it('is rendered', () => {
    const component = shallow(<ToolbarButton onClick={noop} hasArrow />);
    expect(component).toMatchSnapshot();
  });
});
