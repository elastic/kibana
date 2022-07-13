/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { SolutionNavCollapseButton } from './collapse_button';

describe('SolutionNavCollapseButton', () => {
  test('renders', () => {
    const component = shallow(<SolutionNavCollapseButton isCollapsed={false} />);
    expect(component).toMatchSnapshot();
    expect(component.find('.kbnSolutionNavCollapseButton').prop('title')).toBe(
      'Collapse side navigation'
    );
  });

  test('isCollapsed', () => {
    const component = shallow(<SolutionNavCollapseButton isCollapsed={true} />);
    expect(component).toMatchSnapshot();
    expect(component.find('.kbnSolutionNavCollapseButton').prop('title')).toBe(
      'Open side navigation'
    );
  });
});
