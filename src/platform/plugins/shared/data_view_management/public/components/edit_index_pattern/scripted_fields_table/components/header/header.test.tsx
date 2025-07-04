/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithI18nProvider } from '@kbn/test-jest-helpers';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { mockManagementPlugin } from '../../../../../mocks';

import { Header } from './header';

describe('Header', () => {
  const mockedContext = mockManagementPlugin.createIndexPatternManagmentContext();
  test('should render normally', () => {
    const component = mountWithI18nProvider(<Header />, {
      wrappingComponent: KibanaContextProvider,
      wrappingComponentProps: {
        services: mockedContext,
      },
    });

    expect(component.render()).toMatchSnapshot();
  });
});
