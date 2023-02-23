/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { PrimaryButton } from './primary';

describe('<ToolbarButton />', () => {
  test('is rendered', () => {
    const component = mountWithIntl(<PrimaryButton label="test" />);
    expect(component.render()).toMatchSnapshot();
  });

  test('it can be passed a functional onClick handler', () => {
    const mockHandler = jest.fn();
    const component = mountWithIntl(<PrimaryButton label="withOnClick" onClick={mockHandler} />);
    component.find('button').simulate('click');
    expect(mockHandler).toHaveBeenCalled();
  });
});
