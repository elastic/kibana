/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithIntl } from '@kbn/test-jest-helpers';

import { ViewButton } from './view_button';
import { SampleDataCardProvider } from '../services';
import { getMockServices } from '../mocks';

const render = (element: React.ReactElement) =>
  renderWithIntl(<SampleDataCardProvider {...getMockServices()}>{element}</SampleDataCardProvider>);

test('should render simple button when appLinks is empty', () => {
  const component = render(
    <ViewButton
      id="ecommerce"
      name="Sample eCommerce orders"
      overviewDashboard="722b74f0-b882-11e8-a6d9-e546fe2bba5f"
      appLinks={[]}
    />
  );
  expect(component).toMatchSnapshot();
});

test('should render popover when appLinks is not empty', () => {
  const appLinks = [
    {
      path: 'app/myAppPath',
      label: 'myAppLabel',
      icon: 'logoKibana',
    },
  ];

  const component = render(
    <ViewButton
      id="ecommerce"
      name="Sample eCommerce orders"
      overviewDashboard="722b74f0-b882-11e8-a6d9-e546fe2bba5f"
      appLinks={appLinks}
    />
  );
  expect(component).toMatchSnapshot();
});

test('should render popover with ordered appLinks', () => {
  const appLinks = [
    {
      path: 'app/myAppPath',
      label: 'myAppLabel[-1]',
      icon: 'logoKibana',
      order: -1, // to position it above Dashboard link
    },
    {
      path: 'app/myAppPath',
      label: 'myAppLabel',
      icon: 'logoKibana',
    },
    {
      path: 'app/myAppPath',
      label: 'myAppLabel[5]',
      icon: 'logoKibana',
      order: 5,
    },
    {
      path: 'app/myAppPath',
      label: 'myAppLabel[3]',
      icon: 'logoKibana',
      order: 3,
    },
  ];

  const component = render(
    <ViewButton
      id="ecommerce"
      name="Sample eCommerce orders"
      overviewDashboard="722b74f0-b882-11e8-a6d9-e546fe2bba5f"
      appLinks={appLinks}
    />
  );
  expect(component).toMatchSnapshot();
});
