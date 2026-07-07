/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { getNoDataConfigPageServicesMock } from '@kbn/shared-ux-page-no-data-config-mocks';

import { NoDataConfigPage } from './no_data_config_page';
import { NoDataConfigPageProvider } from './services';

describe('NoDataConfigPage', () => {
  const noDataConfig = {
    docsLink: 'test-link',
    action: {
      kibana: {
        buttonText: 'Click me',
        onClick: jest.fn(),
        description: 'Page with no data',
      },
    },
  };
  test('renders', () => {
    render(
      <NoDataConfigPageProvider {...getNoDataConfigPageServicesMock()}>
        <NoDataConfigPage noDataConfig={noDataConfig} />
      </NoDataConfigPageProvider>
    );

    expect(screen.getByText('Click me')).toBeInTheDocument();
    expect(screen.getByText('Page with no data')).toBeInTheDocument();
  });

  test('renders nothing when noDataConfig is not provided', () => {
    const { container } = render(
      <NoDataConfigPageProvider {...getNoDataConfigPageServicesMock()}>
        <NoDataConfigPage />
      </NoDataConfigPageProvider>
    );

    // Should render nothing when noDataConfig is undefined
    expect(container.firstChild).toBeNull();
  });

  test('renders with sidebar when pageSideBar is provided', () => {
    render(
      <NoDataConfigPageProvider {...getNoDataConfigPageServicesMock()}>
        <NoDataConfigPage
          noDataConfig={noDataConfig}
          pageSideBar={<div data-test-subj="test-sidebar">Test Sidebar</div>}
        />
      </NoDataConfigPageProvider>
    );

    // Should render the sidebar
    expect(screen.getByTestId('test-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Test Sidebar')).toBeInTheDocument();

    // Should also render the main content
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
