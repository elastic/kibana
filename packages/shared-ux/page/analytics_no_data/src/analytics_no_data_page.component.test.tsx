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
import { KibanaNoDataPage } from '@kbn/shared-ux-page-kibana-no-data';

import { AnalyticsNoDataPage } from './analytics_no_data_page.component';
import { AnalyticsNoDataPageProvider } from './services';
import { getMockServices } from './mocks';

describe('AnalyticsNoDataPageComponent', () => {
  const services = getMockServices();
  const onDataViewCreated = jest.fn();

  it('renders correctly', async () => {
    const component = mountWithIntl(
      // Include context so composed components will have access to their services.
      <AnalyticsNoDataPageProvider {...services}>
        <AnalyticsNoDataPage
          onDataViewCreated={onDataViewCreated}
          kibanaGuideDocLink={'http://www.test.com'}
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
});
