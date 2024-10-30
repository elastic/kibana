/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { NewsLoadingPrompt } from './loading_news';

describe('news_loading', () => {
  describe('rendering', () => {
    it('renders the default News Loading', () => {
      const wrapper = shallow(<NewsLoadingPrompt showPlainSpinner={false} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
    it('renders the News Loading with EuiLoadingSpinner', () => {
      const wrapper = shallow(<NewsLoadingPrompt showPlainSpinner={true} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
