/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

import { AnalyticsNoDataPage } from './analytics_no_data_page.component';
import { AnalyticsNoDataPageProvider } from './services';
import { getAnalyticsNoDataPageServicesMock } from '@kbn/shared-ux-page-analytics-no-data-mocks';

describe('AnalyticsNoDataPageComponent', () => {
  // Always mock no ES data and no user data views for no-data UI
  const services = {
    ...getAnalyticsNoDataPageServicesMock(),
    hasESData: async () => false,
    hasUserDataView: async () => false,
    kibanaGuideDocLink: 'http://www.test.com',
  };
  const onDataViewCreated = jest.fn();

  it('renders correctly', async () => {
    const component = renderWithI18n(
      <AnalyticsNoDataPageProvider {...services}>
        <AnalyticsNoDataPage
          {...services}
          onDataViewCreated={onDataViewCreated}
          showPlainSpinner={false}
        />
      </AnalyticsNoDataPageProvider>
    );

    await act(() => new Promise(setImmediate));

    expect(component.container.querySelector('[data-test-subj="kbnNoDataPage"]')).toBeTruthy();
  });

  it('allows ad-hoc data view creation', async () => {
    const component = renderWithI18n(
      <AnalyticsNoDataPageProvider {...services}>
        <AnalyticsNoDataPage
          {...services}
          onDataViewCreated={onDataViewCreated}
          allowAdHocDataView={true}
          showPlainSpinner={false}
        />
      </AnalyticsNoDataPageProvider>
    );

    await act(() => new Promise(setImmediate));

    expect(component.container.querySelector('[data-test-subj="kbnNoDataPage"]')).toBeTruthy();
  });

  describe('no data state', () => {
    describe('kibana flavor', () => {
      it('renders add integrations card', async () => {
        renderWithI18n(
          <AnalyticsNoDataPageProvider {...services}>
            <AnalyticsNoDataPage
              {...services}
              onDataViewCreated={onDataViewCreated}
              showPlainSpinner={false}
            />
          </AnalyticsNoDataPageProvider>
        );

        await screen.findByTestId('kbnOverviewAddIntegrations');
        screen.getAllByText('Browse integrations');
      });

      it('renders disabled add integrations card when fleet is not available', async () => {
        renderWithI18n(
          <AnalyticsNoDataPageProvider
            {...{
              ...services,
              canAccessFleet: false,
            }}
          >
            <AnalyticsNoDataPage
              {...services}
              onDataViewCreated={onDataViewCreated}
              showPlainSpinner={false}
            />
          </AnalyticsNoDataPageProvider>
        );

        await screen.findByTestId('kbnOverviewAddIntegrations');
        screen.getByText('Contact your administrator');
      });
    });

    describe('serverless_search flavor', () => {
      beforeEach(() => {
        services.pageFlavor = 'serverless_search';
      });

      it('renders Add Data card', async () => {
        renderWithI18n(
          <AnalyticsNoDataPageProvider {...services}>
            <AnalyticsNoDataPage
              {...services}
              onDataViewCreated={onDataViewCreated}
              showPlainSpinner={false}
            />
          </AnalyticsNoDataPageProvider>
        );

        await screen.findByTestId('kbnOverviewElasticsearchAddData');
      });
    });

    describe('serverless_observability flavor', () => {
      beforeEach(() => {
        services.pageFlavor = 'serverless_observability';
      });

      it('renders Add Data card', async () => {
        renderWithI18n(
          <AnalyticsNoDataPageProvider {...services}>
            <AnalyticsNoDataPage
              {...services}
              onDataViewCreated={onDataViewCreated}
              showPlainSpinner={false}
            />
          </AnalyticsNoDataPageProvider>
        );

        await screen.findByTestId('kbnObservabilityNoData');
      });
    });
  });
});
