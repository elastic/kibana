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

import { ToolbarButton } from './toolbar_button';

describe('<ToolbarButton />', () => {
  describe('standard', () => {
    test('is rendered - default', () => {
      const component = mountWithIntl(
        <ToolbarButton label="Create chart" onClick={() => 'click'} />
      );
      expect(component.render()).toMatchSnapshot();
    });

    test('is rendered - primary', () => {
      const component = mountWithIntl(
        <ToolbarButton type="primary" label="Create chart" onClick={() => 'click'} />
      );
      expect(component.render()).toMatchSnapshot();
    });

    test('is rendered - text wth icon', () => {
      const component = mountWithIntl(
        <ToolbarButton
          type="primary"
          iconType="plusInCircle"
          label="Create chart"
          onClick={() => 'click'}
        />
      );
      expect(component.render()).toMatchSnapshot();
    });

    test('accepts an onClick handler', () => {
      const mockHandler = jest.fn();
      const component = mountWithIntl(<ToolbarButton label="Create chart" onClick={mockHandler} />);
      component.find('button').simulate('click');
      expect(mockHandler).toHaveBeenCalled();
    });

    test('accepts an onBlur handler', () => {
      const mockHandler = jest.fn();
      const component = mountWithIntl(<ToolbarButton label="Create chart" onBlur={mockHandler} />);
      component.find('button').simulate('blur');
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('iconButton', () => {
    test('is rendered - default', () => {
      const component = mountWithIntl(
        <ToolbarButton as="iconButton" iconType="launch" onClick={jest.fn()} />
      );
      expect(component.render()).toMatchSnapshot();
    });
  });
});
