/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { ServerStatus } from './server_status';
import { FormattedStatus } from '../lib';

const getStatus = (parts: Partial<FormattedStatus['state']> = {}): FormattedStatus['state'] => ({
  id: 'green',
  title: 'Green',
  uiColor: 'secondary',
  message: '',
  ...parts,
});

describe('ServerStatus', () => {
  it('renders correctly for green state', () => {
    const status = getStatus();
    const component = mount(<ServerStatus serverState={status} name="My Computer" />);
    expect(component.find('EuiTitle').text()).toMatchInlineSnapshot(`"Kibana status is Green"`);
    expect(component.find('EuiBadge')).toMatchSnapshot();
  });

  it('renders correctly for red state', () => {
    const status = getStatus({
      id: 'red',
      title: 'Red',
    });
    const component = mount(<ServerStatus serverState={status} name="My Computer" />);
    expect(component.find('EuiTitle').text()).toMatchInlineSnapshot(`"Kibana status is Red"`);
    expect(component.find('EuiBadge')).toMatchSnapshot();
  });

  it('displays the correct `name`', () => {
    let component = mount(<ServerStatus serverState={getStatus()} name="Localhost" />);
    expect(component.find('EuiText').text()).toMatchInlineSnapshot(`"Localhost"`);

    component = mount(<ServerStatus serverState={getStatus()} name="Kibana" />);
    expect(component.find('EuiText').text()).toMatchInlineSnapshot(`"Kibana"`);
  });
});
