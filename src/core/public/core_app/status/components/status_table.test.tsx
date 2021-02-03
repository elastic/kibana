/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { StatusTable } from './status_table';

const state = {
  id: 'green',
  uiColor: 'secondary',
  message: 'Ready',
  title: 'green',
};

describe('StatusTable', () => {
  it('renders when statuses is provided', () => {
    const component = shallow(<StatusTable statuses={[{ id: 'plugin:1', state }]} />);
    expect(component).toMatchSnapshot();
  });

  it('renders when statuses is not provided', () => {
    const component = shallow(<StatusTable />);
    expect(component.isEmptyRender()).toBe(true);
  });
});
