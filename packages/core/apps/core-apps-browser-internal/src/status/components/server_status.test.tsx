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
    const component = mountWithIntl(<ServerStatus serverState={status} name="My Computer" />);
    expect(component.find('EuiTitle').text()).toMatchInlineSnapshot(`"Kibana status is Green"`);
    expect(component.find('EuiBadge').render()).toMatchSnapshot();
  });

  it('renders correctly for yellow state', () => {
    const status = getStatus({
      id: 'degraded',
      title: 'Yellow',
    });
    const component = mountWithIntl(<ServerStatus serverState={status} name="My Computer" />);
    expect(component.find('EuiTitle').text()).toMatchInlineSnapshot(`"Kibana status is Yellow"`);
    expect(component.find('EuiBadge').render()).toMatchSnapshot();
  });

  it('renders correctly for red state', () => {
    const status = getStatus({
      id: 'unavailable',
      title: 'Red',
    });
    const component = mountWithIntl(<ServerStatus serverState={status} name="My Computer" />);
    expect(component.find('EuiTitle').text()).toMatchInlineSnapshot(`"Kibana status is Red"`);
    expect(component.find('EuiBadge').render()).toMatchSnapshot();
  });

  it('displays the correct `name`', () => {
    let component = mountWithIntl(<ServerStatus serverState={getStatus()} name="Localhost" />);
    expect(component.find('EuiText').text()).toMatchInlineSnapshot(`"Localhost"`);

    component = mountWithIntl(<ServerStatus serverState={getStatus()} name="Kibana" />);
    expect(component.find('EuiText').text()).toMatchInlineSnapshot(`"Kibana"`);
  });
});
