/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { KibanaSolutionAvatar } from './solution_avatar';

describe('KibanaSolutionAvatar', () => {
  test('renders', () => {
    const nameAndIcon = shallow(<KibanaSolutionAvatar name="Solution" iconType="logoElastic" />);
    expect(nameAndIcon).toMatchSnapshot();
    const nameOnly = shallow(<KibanaSolutionAvatar name="Elastic Stack" />);
    expect(nameOnly).toMatchSnapshot();
  });
});
