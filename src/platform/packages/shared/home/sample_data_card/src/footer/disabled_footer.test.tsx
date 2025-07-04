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

import { DisabledFooter, Props } from './disabled_footer';
import { SampleDataCardProvider } from '../services';
import { getMockServices } from '../mocks';

describe('install footer', () => {
  const props: Props = {
    id: 'data-set-id',
    name: 'Data Set Name',
    statusMsg: 'Data Set Status Message',
  };

  const render = (element: React.ReactElement) =>
    renderWithIntl(
      <SampleDataCardProvider {...getMockServices()}>{element}</SampleDataCardProvider>
    );

  test('should render', () => {
    const component = render(<DisabledFooter {...props} />);
    expect(component).toMatchSnapshot();
  });
});
