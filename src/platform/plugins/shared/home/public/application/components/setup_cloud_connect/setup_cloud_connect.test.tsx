/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { SetupCloudConnect } from './setup_cloud_connect';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    trackUiMetric: jest.fn(),
  }),
}));

const addBasePathMock = jest.fn((path: string) => (path ? path : 'path'));
const applicationMock = {
  getUrlForApp: jest.fn(() => '/app/cloud_connect'),
  navigateToApp: jest.fn(),
} as any;

describe('SetupCloudConnect', () => {
  test('renders as expected', () => {
    const component = shallowWithIntl(
      <SetupCloudConnect addBasePath={addBasePathMock} application={applicationMock} />
    );

    const $button = component.find('EuiButton');
    expect($button.props().href).toBe('/app/cloud_connect');
  });
});
