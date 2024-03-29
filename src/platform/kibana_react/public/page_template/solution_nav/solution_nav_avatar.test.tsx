/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { KibanaPageTemplateSolutionNavAvatar } from './solution_nav_avatar';

describe('KibanaPageTemplateSolutionNavAvatar', () => {
  test('renders', () => {
    const component = shallow(
      <KibanaPageTemplateSolutionNavAvatar name="Solution" iconType="logoElastic" />
    );
    expect(component).toMatchSnapshot();
  });
});
