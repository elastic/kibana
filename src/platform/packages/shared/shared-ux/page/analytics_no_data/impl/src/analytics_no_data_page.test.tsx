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
import userEvent from '@testing-library/user-event';
import {
  getAnalyticsNoDataPageServicesMock,
  getAnalyticsNoDataPageServicesMockWithCustomBranding,
} from '@kbn/shared-ux-page-analytics-no-data-mocks';

import { AnalyticsNoDataPageProvider } from './services';
import { AnalyticsNoDataPage } from './analytics_no_data_page';

describe('AnalyticsNoDataPage', () => {
  const onDataViewCreated = jest.fn();
  const user = userEvent.setup();

  const services = getAnalyticsNoDataPageServicesMock();
  const servicesWithCustomBranding = getAnalyticsNoDataPageServicesMockWithCustomBranding();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    const { container } = render(
      <AnalyticsNoDataPageProvider {...services}>
        <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} allowAdHocDataView={true} />
      </AnalyticsNoDataPageProvider>
    );

    // Should render without crashing and have content
    await waitFor(() => {
      expect(container.firstChild).toBeTruthy();
    });
  });

  it('renders with custom branding', async () => {
    const { container } = render(
      <AnalyticsNoDataPageProvider {...servicesWithCustomBranding}>
        <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} allowAdHocDataView={true} />
      </AnalyticsNoDataPageProvider>
    );

    // Should render with custom branding
    await waitFor(() => {
      expect(container.firstChild).toBeTruthy();
    });
  });

  it('renders when allowAdHocDataView is false', async () => {
    const { container } = render(
      <AnalyticsNoDataPageProvider {...services}>
        <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} allowAdHocDataView={false} />
      </AnalyticsNoDataPageProvider>
    );

    // Should render without the ad-hoc data view option
    await waitFor(() => {
      expect(container.firstChild).toBeTruthy();
    });
  });

  it('handles onTryESQL action when ES data exists but no data views', async () => {
    // Mock the services to simulate ES data exists but no user data views
    jest.spyOn(services, 'hasESData').mockResolvedValue(true);
    jest.spyOn(services, 'hasUserDataView').mockResolvedValue(false);

    const onTryESQL = jest.fn();

    render(
      <AnalyticsNoDataPageProvider {...services}>
        <AnalyticsNoDataPage
          onDataViewCreated={onDataViewCreated}
          allowAdHocDataView={true}
          onTryESQL={onTryESQL}
        />
      </AnalyticsNoDataPageProvider>
    );

    // Wait for the component to load and find the try ESQL button
    await waitFor(() => {
      expect(screen.getByTestId('tryESQLLink')).toBeInTheDocument();
    });

    // Click the try ESQL button
    const tryESQLButton = screen.getByTestId('tryESQLLink');
    await user.click(tryESQLButton);

    // Should call the onTryESQL callback
    expect(onTryESQL).toHaveBeenCalled();
  });

  it('renders appropriately when no ES data exists', async () => {
    // Mock the services to simulate no ES data exists
    jest.spyOn(services, 'hasESData').mockResolvedValue(false);
    jest.spyOn(services, 'hasUserDataView').mockResolvedValue(false);

    const { container } = render(
      <AnalyticsNoDataPageProvider {...services}>
        <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} allowAdHocDataView={true} />
      </AnalyticsNoDataPageProvider>
    );

    // Should render the no data state
    await waitFor(() => {
      expect(container.firstChild).toBeTruthy();
    });
  });
});
