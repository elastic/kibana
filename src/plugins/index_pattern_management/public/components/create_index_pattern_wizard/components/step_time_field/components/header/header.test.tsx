/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { Header } from '../header';
import { shallow } from 'enzyme';

describe('Header', () => {
  it('should render normally', () => {
    const component = shallow(<Header indexPattern="ki*" indexPatternName="ki*" />);

    expect(component).toMatchSnapshot();
  });
});
