/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';

import { FormRow } from './form_row';

test('renders enabled control', () => {
  const component = shallow(
    <FormRow label="test control" id="controlId" controlIndex={0}>
      <div>My Control</div>
    </FormRow>
  );
  expect(component).toMatchSnapshot();
});

test('renders control with warning', () => {
  const component = shallow(
    <FormRow label="test control" id="controlId" controlIndex={0} warningMsg="This is a warning">
      <div>My Control</div>
    </FormRow>
  );
  expect(component).toMatchSnapshot();
});

test('renders disabled control with tooltip', () => {
  const component = shallow(
    <FormRow
      label="test control"
      id="controlId"
      disableMsg="I am disabled for testing purposes"
      controlIndex={0}
    >
      <div>My Control</div>
    </FormRow>
  );
  expect(component).toMatchSnapshot();
});
