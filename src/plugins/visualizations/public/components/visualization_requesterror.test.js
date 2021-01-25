/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { render } from 'enzyme';
import { VisualizationRequestError } from './visualization_requesterror';

describe('VisualizationRequestError', () => {
  it('should render according to snapshot', () => {
    const wrapper = render(<VisualizationRequestError error="Request error" />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should set html when error is an object', () => {
    const wrapper = render(<VisualizationRequestError error={{ message: 'Request error' }} />);
    expect(wrapper.text()).toBe('Request error');
  });

  it('should set html when error is a string', () => {
    const wrapper = render(<VisualizationRequestError error="Request error" />);
    expect(wrapper.text()).toBe('Request error');
  });
});
