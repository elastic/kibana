/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { GaugeSeries } from './series';
import { mountWithIntl } from '@kbn/test-jest-helpers';

const defaultProps = {
  disableAdd: true,
  disableDelete: true,
  dragHandleProps: {},
  toggleVisible: jest.fn(),
  onAdd: jest.fn(),
  onChange: jest.fn(),
  onClone: jest.fn(),
  onDelete: jest.fn(),
};

it('should disable add data', () => {
  const wrapper = mountWithIntl(<GaugeSeries {...defaultProps} />);
  const props = wrapper.props();

  expect(props.disableAdd).toBeTruthy();
});

it('should disable delete data', () => {
  const wrapper = mountWithIntl(<GaugeSeries {...defaultProps} />);
  const props = wrapper.props();
  expect(props.disableDelete).toBeTruthy();
});

it('should call toggleVisible function', () => {
  const wrapper = mountWithIntl(<GaugeSeries {...defaultProps} />);
  wrapper.find('EuiButtonIcon').at(0).simulate('click');
  expect(defaultProps.toggleVisible).toBeCalled();
});
