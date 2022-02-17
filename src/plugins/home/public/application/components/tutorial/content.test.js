/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { Content } from './content';

test('should render content with markdown', () => {
  const component = shallow(
    <Content
      text={'I am *some* [content](https://en.wikipedia.org/wiki/Content) with `markdown`'}
    />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
