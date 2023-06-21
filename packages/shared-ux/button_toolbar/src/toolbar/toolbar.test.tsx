/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { Toolbar } from './toolbar';
import { ToolbarButton } from '../buttons';

describe('<Toolbar />', () => {
  test('is rendered', () => {
    const primaryButton = (
      <ToolbarButton type="primary" label="Create chart" onClick={() => 'click'} />
    );
    const children = { primaryButton };
    const component = mountWithIntl(<Toolbar children={children} />);

    expect(component.render()).toMatchSnapshot();
  });

  test('onClick works as expected when the primary button is clicked', () => {
    const mockClickHandler = jest.fn();
    const primaryButton = (
      <ToolbarButton type="primary" label="Create chart" onClick={mockClickHandler} />
    );
    const children = { primaryButton };
    const component = mountWithIntl(<Toolbar children={children} />);
    component.find('button').simulate('click');
    expect(mockClickHandler).toHaveBeenCalled();
  });
});
