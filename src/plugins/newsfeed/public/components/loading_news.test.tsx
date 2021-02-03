/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as React from 'react';
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { NewsLoadingPrompt } from './loading_news';

describe('news_loading', () => {
  describe('rendering', () => {
    it('renders the default News Loading', () => {
      const wrapper = shallow(<NewsLoadingPrompt />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
