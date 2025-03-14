/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { ToolbarPopover } from './popover';

describe('<ToolbarPopover />', () => {
  test('is rendered', () => {
    const isOpen = true;
    const component = mountWithIntl(<ToolbarPopover label="test" children={() => !isOpen} />);
    expect(component.render()).toMatchSnapshot();
  });

  test('accepts an onClick handler', () => {
    const isOpen = true;
    const mockHandler = jest.fn();

    const component = mountWithIntl(
      <ToolbarPopover label="test" children={() => !isOpen} onClick={mockHandler} />
    );

    component.simulate('click');
    expect(mockHandler).toHaveBeenCalled();
  });

  test('defaults to a bordered empty button', () => {
    const isOpen = true;
    const component = mountWithIntl(<ToolbarPopover label="test" children={() => !isOpen} />);
    const button = component.find('EuiButton');
    expect(button.prop('color')).toBe('text');
    expect(button.prop('css')).toMatchObject({
      backgroundColor: '#FFFFFF',
      border: '1px solid #E3E8F2',
      color: '#1D2A3E',
    });
  });

  test('accepts a button type', () => {
    const isOpen = true;
    const component = mountWithIntl(
      <ToolbarPopover type="primary" label="test" children={() => !isOpen} />
    );
    const button = component.find('EuiButton');
    expect(button.prop('color')).toBe('primary');
  });

  test('if not given an iconType, render arrowDown on the right', () => {
    const isOpen = false;

    const component = mountWithIntl(<ToolbarPopover label="test" children={() => !isOpen} />);
    const button = component.find('EuiButton');
    expect(button.prop('iconType')).toBe('arrowDown');
    expect(button.prop('iconSide')).toBe('right');
  });

  test('if given an iconType, render it on the left', () => {
    const isOpen = false;

    const component = mountWithIntl(
      <ToolbarPopover label="test" iconType="plusInCircle" children={() => !isOpen} />
    );
    const button = component.find('EuiButton');
    expect(button.prop('iconType')).toBe('plusInCircle');
    expect(button.prop('iconSide')).toBe('left');
  });
});
