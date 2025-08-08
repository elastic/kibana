/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
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
    const { container, getByText } = renderWithI18n(
      <ServerStatus serverState={status} name="My Computer" />
    );
    expect(getByText('Kibana status is Green')).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders correctly for yellow state', () => {
    const status = getStatus({
      id: 'degraded',
      title: 'Yellow',
    });
    const { container, getByText } = renderWithI18n(
      <ServerStatus serverState={status} name="My Computer" />
    );
    expect(getByText('Kibana status is Yellow')).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders correctly for red state', () => {
    const status = getStatus({
      id: 'unavailable',
      title: 'Red',
    });
    const { container, getByText } = renderWithI18n(
      <ServerStatus serverState={status} name="My Computer" />
    );
    expect(getByText('Kibana status is Red')).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('displays the correct `name`', () => {
    const { getByText } = renderWithI18n(
      <ServerStatus serverState={getStatus()} name="Localhost" />
    );
    expect(getByText('Localhost')).toBeInTheDocument();

    const { getByText: getByTextKibana } = renderWithI18n(
      <ServerStatus serverState={getStatus()} name="Kibana" />
    );
    expect(getByTextKibana('Kibana')).toBeInTheDocument();
  });
});
