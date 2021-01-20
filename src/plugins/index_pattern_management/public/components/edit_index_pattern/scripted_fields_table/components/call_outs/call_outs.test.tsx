/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { CallOuts } from '../call_outs';

describe('CallOuts', () => {
  test('should render normally', () => {
    const component = shallow(
      <CallOuts
        deprecatedLangsInUse={['php']}
        painlessDocLink="http://www.elastic.co/painlessDocs"
      />
    );

    expect(component).toMatchSnapshot();
  });

  test('should render without any call outs', () => {
    const component = shallow(
      <CallOuts deprecatedLangsInUse={[]} painlessDocLink="http://www.elastic.co/painlessDocs" />
    );

    expect(component).toMatchSnapshot();
  });
});
