/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { getKibanaNoDataPageServicesMock } from '@kbn/shared-ux-page-kibana-no-data-mocks';

import { KibanaNoDataPage } from './kibana_no_data_page';
import { KibanaNoDataPageProvider } from './services';

describe('KibanaNoDataPage', () => {
  const noDataConfig = {
    action: {
      elasticAgent: {
        title: 'Add Integrations',
      },
    },
    docsLink: 'http://www.docs.com',
  };

  const onDataViewCreated = jest.fn();
  const config = {
    hasESData: false,
    hasDataView: false,
    hasUserDataView: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders NoDataConfigPage when no ES data exists', async () => {
    const services = getKibanaNoDataPageServicesMock(config);

    render(
      <KibanaNoDataPageProvider {...services}>
        <KibanaNoDataPage
          noDataConfig={noDataConfig}
          onDataViewCreated={onDataViewCreated}
          showPlainSpinner={false}
        />
      </KibanaNoDataPageProvider>
    );

    // Wait for loading to complete and NoDataConfigPage to render
    await waitFor(() => {
      expect(screen.getByText('Add Integrations')).toBeInTheDocument();
    });
  });

  it('renders NoDataViewsPrompt when ES data exists but no user data views', async () => {
    const services = getKibanaNoDataPageServicesMock({ ...config, hasESData: true });

    render(
      <KibanaNoDataPageProvider {...services}>
        <KibanaNoDataPage
          noDataConfig={noDataConfig}
          onDataViewCreated={onDataViewCreated}
          showPlainSpinner={false}
        />
      </KibanaNoDataPageProvider>
    );

    // Wait for loading to complete and NoDataViewsPrompt to render
    await waitFor(() => {
      expect(screen.getByTestId('noDataViewsPrompt')).toBeInTheDocument();
    });
  });

  it('renders loading indicator while checking data', async () => {
    // Create a custom mock that never resolves to keep loading state
    const mockServices = getKibanaNoDataPageServicesMock();
    const neverResolvePromise = new Promise<boolean>(() => {});

    // Mock the service methods to return promises that never resolve
    mockServices.hasESData = jest.fn().mockReturnValue(neverResolvePromise);
    mockServices.hasUserDataView = jest.fn().mockReturnValue(neverResolvePromise);

    const { container } = render(
      <KibanaNoDataPageProvider {...mockServices}>
        <KibanaNoDataPage
          noDataConfig={noDataConfig}
          onDataViewCreated={onDataViewCreated}
          showPlainSpinner={false}
        />
      </KibanaNoDataPageProvider>
    );

    // Should show loading indicator (EuiLoadingElastic)
    expect(container.querySelector('.euiLoadingElastic')).toBeInTheDocument();
  });

  it('shows EuiLoadingSpinner when showPlainSpinner is true', async () => {
    // Create a custom mock that never resolves to keep loading state
    const mockServices = getKibanaNoDataPageServicesMock();
    const neverResolvePromise = new Promise<boolean>(() => {});

    // Mock the service methods to return promises that never resolve
    mockServices.hasESData = jest.fn().mockReturnValue(neverResolvePromise);
    mockServices.hasUserDataView = jest.fn().mockReturnValue(neverResolvePromise);

    const { container } = render(
      <KibanaNoDataPageProvider {...mockServices}>
        <KibanaNoDataPage
          noDataConfig={noDataConfig}
          onDataViewCreated={onDataViewCreated}
          showPlainSpinner={true}
        />
      </KibanaNoDataPageProvider>
    );

    // Should show plain spinner instead of Elastic branded one
    expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });
});
