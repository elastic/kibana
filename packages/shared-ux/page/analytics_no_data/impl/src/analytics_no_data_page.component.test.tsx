/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { I18nProvider } from '@kbn/i18n-react';

import { KibanaNoDataPage } from '@kbn/shared-ux-page-kibana-no-data';
import { render, screen } from '@testing-library/react';

import { AnalyticsNoDataPage } from './analytics_no_data_page.component';
import { AnalyticsNoDataPageProvider } from './services';
import { getAnalyticsNoDataPageServicesMock } from '@kbn/shared-ux-page-analytics-no-data-mocks';

describe('AnalyticsNoDataPageComponent', () => {
  const services = getAnalyticsNoDataPageServicesMock();
  services.kibanaGuideDocLink = 'http://www.test.com';
  const onDataViewCreated = jest.fn();

  it('renders correctly', async () => {
    const component = mountWithIntl(
      // Include context so composed components will have access to their services.
      <AnalyticsNoDataPageProvider {...services}>
        <AnalyticsNoDataPage
          {...services}
          onDataViewCreated={onDataViewCreated}
          showPlainSpinner={false}
        />
      </AnalyticsNoDataPageProvider>
    );

    await act(() => new Promise(setImmediate));

    expect(component.find(KibanaNoDataPage).length).toBe(1);

    const noDataConfig = component.find(KibanaNoDataPage).props().noDataConfig;
    expect(noDataConfig.solution).toEqual('Analytics');
    expect(noDataConfig.pageTitle).toEqual('Welcome to Analytics!');
    expect(noDataConfig.logo).toEqual('logoKibana');
    expect(noDataConfig.docsLink).toEqual('http://www.test.com');
    expect(noDataConfig.action.elasticAgent).not.toBeNull();
  });

  it('allows ad-hoc data view creation', async () => {
    const component = mountWithIntl(
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

    expect(component.find(KibanaNoDataPage).length).toBe(1);
    expect(component.find(KibanaNoDataPage).props().allowAdHocDataView).toBe(true);
  });

  describe('no data state', () => {
    describe('kibana flavor', () => {
      it('renders add integrations card', async () => {
        render(
          <I18nProvider>
            <AnalyticsNoDataPageProvider {...{ ...services, hasESData: async () => false }}>
              <AnalyticsNoDataPage
                {...services}
                onDataViewCreated={onDataViewCreated}
                showPlainSpinner={false}
              />
            </AnalyticsNoDataPageProvider>
          </I18nProvider>
        );

        await screen.findByTestId('kbnOverviewAddIntegrations');
        screen.getAllByText('Add integrations');
      });

      it('renders disabled add integrations card when fleet is not available', async () => {
        render(
          <I18nProvider>
            <AnalyticsNoDataPageProvider
              {...{ ...services, hasESData: async () => false, canAccessFleet: false }}
            >
              <AnalyticsNoDataPage
                {...services}
                onDataViewCreated={onDataViewCreated}
                showPlainSpinner={false}
              />
            </AnalyticsNoDataPageProvider>
          </I18nProvider>
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
        render(
          <I18nProvider>
            <AnalyticsNoDataPageProvider {...{ ...services, hasESData: async () => false }}>
              <AnalyticsNoDataPage
                {...services}
                onDataViewCreated={onDataViewCreated}
                showPlainSpinner={false}
              />
            </AnalyticsNoDataPageProvider>
          </I18nProvider>
        );

        await screen.findByTestId('kbnOverviewElasticsearchAddData');
      });

      it('renders the same Add Data card when fleet is not available', async () => {
        render(
          <I18nProvider>
            <AnalyticsNoDataPageProvider
              {...{ ...services, hasESData: async () => false, canAccessFleet: false }}
            >
              <AnalyticsNoDataPage
                {...services}
                onDataViewCreated={onDataViewCreated}
                showPlainSpinner={false}
              />
            </AnalyticsNoDataPageProvider>
          </I18nProvider>
        );

        await screen.findByTestId('kbnOverviewElasticsearchAddData');
      });
    });

    describe('serverless_observability flavor', () => {
      beforeEach(() => {
        services.pageFlavor = 'serverless_observability';
      });

      it('renders Add Data card', async () => {
        render(
          <I18nProvider>
            <AnalyticsNoDataPageProvider {...{ ...services, hasESData: async () => false }}>
              <AnalyticsNoDataPage
                {...services}
                onDataViewCreated={onDataViewCreated}
                showPlainSpinner={false}
              />
            </AnalyticsNoDataPageProvider>
          </I18nProvider>
        );

        await screen.findByTestId('kbnObservabilityNoData');
      });
    });
  });
});
