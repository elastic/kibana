/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Header } from './header';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { mockManagementPlugin } from '../../../../../mocks';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

describe('Header', () => {
  const mockedContext = mockManagementPlugin.createIndexPatternManagmentContext();

  it('should render normally', () => {
    renderWithKibanaRenderContext(
      <KibanaContextProvider services={mockedContext}>
        <Header />
      </KibanaContextProvider>
    );

    expect(screen.getByText('Scripted fields are deprecated')).toBeVisible();
    expect(
      screen.getByText('instead of scripted fields. Runtime fields support Painless scripting', {
        exact: false,
      })
    ).toBeVisible();
    expect(screen.getByText('runtime fields')).toBeVisible();
    expect(screen.getByText('Elasticsearch Query Language (ES|QL)')).toBeVisible();
    expect(
      screen.getByText(
        'Scripted fields can be used in visualizations and displayed in documents. However, they cannot be searched.'
      )
    ).toBeVisible();
  });
});
