/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { KibanaPageTemplateSolutionNavCollapseButton } from './solution_nav_collapse_button';

describe('KibanaPageTemplateSolutionNavCollapseButton', () => {
  test('renders', () => {
    const component = shallow(<KibanaPageTemplateSolutionNavCollapseButton collapsed={false} />);
    expect(component).toMatchSnapshot();
    expect(component.find('.kbnPageTemplateSolutionNavCollapseButton').prop('title')).toBe(
      'Collapse side navigation'
    );
  });

  test('collapsed', () => {
    const component = shallow(<KibanaPageTemplateSolutionNavCollapseButton collapsed={true} />);
    expect(component).toMatchSnapshot();
    expect(component.find('.kbnPageTemplateSolutionNavCollapseButton').prop('title')).toBe(
      'Open side navigation'
    );
  });
});
