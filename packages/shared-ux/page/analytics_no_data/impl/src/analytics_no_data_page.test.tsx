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
import { getAnalyticsNoDataPageServicesMock } from '@kbn/shared-ux-page-analytics-no-data-mocks';

import { AnalyticsNoDataPageProvider } from './services';
import { AnalyticsNoDataPage as Component } from './analytics_no_data_page.component';
import { AnalyticsNoDataPage } from './analytics_no_data_page';

describe('AnalyticsNoDataPage', () => {
  const onDataViewCreated = jest.fn();

  const services = getAnalyticsNoDataPageServicesMock();

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', async () => {
    const component = mountWithIntl(
      <AnalyticsNoDataPageProvider {...services}>
        <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} allowAdHocDataView={true} />
      </AnalyticsNoDataPageProvider>
    );

    await act(() => new Promise(setImmediate));

    expect(component.find(Component).length).toBe(1);
    expect(component.find(Component).props().kibanaGuideDocLink).toBe(services.kibanaGuideDocLink);
    expect(component.find(Component).props().onDataViewCreated).toBe(onDataViewCreated);
    expect(component.find(Component).props().allowAdHocDataView).toBe(true);
  });
});
