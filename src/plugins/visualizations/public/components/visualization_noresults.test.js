/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { render } from 'enzyme';
import { VisualizationNoResults } from './visualization_noresults';

describe('VisualizationNoResults', () => {
  it('should render according to snapshot', () => {
    const wrapper = render(<VisualizationNoResults />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should set html', () => {
    const wrapper = render(<VisualizationNoResults />);
    expect(wrapper.text()).toBe('No results found');
  });
});
