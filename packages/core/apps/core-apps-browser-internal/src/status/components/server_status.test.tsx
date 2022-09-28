/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { ServerStatus } from './server_status';
import { StatusState } from '../lib';

const getStatus = (parts: Partial<StatusState> = {}): StatusState => ({
  id: 'available',
  title: 'Green',
  uiColor: 'success',
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

  it('renders correctly for yellow state', () => {
    const status = getStatus({
      id: 'degraded',
      title: 'Yellow',
    });
    const component = mount(<ServerStatus serverState={status} name="My Computer" />);
    expect(component.find('EuiTitle').text()).toMatchInlineSnapshot(`"Kibana status is Yellow"`);
    expect(component.find('EuiBadge')).toMatchSnapshot();
  });

  it('renders correctly for red state', () => {
    const status = getStatus({
      id: 'unavailable',
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
