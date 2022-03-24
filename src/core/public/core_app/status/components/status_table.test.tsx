/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ServiceStatus } from '../../../../types/status';
import { StatusTable } from './status_table';

const state = {
  id: 'available' as const,
  uiColor: 'success',
  message: 'Ready',
  title: 'green',
};

const createServiceStatus = (parts: Partial<ServiceStatus> = {}): ServiceStatus => ({
  level: 'available',
  summary: 'Ready',
  ...parts,
});

describe('StatusTable', () => {
  it('renders when statuses is provided', () => {
    const component = shallow(
      <StatusTable statuses={[{ id: 'plugin:1', state, original: createServiceStatus() }]} />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders empty when statuses is not provided', () => {
    const component = shallow(<StatusTable />);
    expect(component.isEmptyRender()).toBe(true);
  });
});
