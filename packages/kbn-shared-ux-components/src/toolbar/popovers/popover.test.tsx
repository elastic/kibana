/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount as enzymeMount } from 'enzyme';
import React from 'react';
import { ToolbarPopover } from './popover';

describe('<ToolbarPopover />', () => {
  test('is rendered', () => {
    const isOpen = true;
    const component = enzymeMount(<ToolbarPopover label="test" children={() => !isOpen} />);

    expect(component).toMatchSnapshot();
  });

  test('accepts an onClick handler', () => {
    const isOpen = true;
    const mockHandler = jest.fn();
    const component = enzymeMount(
      <ToolbarPopover label="test" children={() => !isOpen} onClick={mockHandler} />
    );
    component.simulate('click');
    expect(mockHandler).toHaveBeenCalled();
  });
});
