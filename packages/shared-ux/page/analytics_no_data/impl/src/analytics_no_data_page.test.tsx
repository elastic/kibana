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
import { mountWithIntl } from '@kbn/test-jest-helpers';
import {
  getAnalyticsNoDataPageServicesMock,
  getAnalyticsNoDataPageServicesMockWithCustomBranding,
} from '@kbn/shared-ux-page-analytics-no-data-mocks';

import { AnalyticsNoDataPageProvider } from './services';
import { AnalyticsNoDataPage as Component } from './analytics_no_data_page.component';
import { AnalyticsNoDataPage } from './analytics_no_data_page';

describe('AnalyticsNoDataPage', () => {
  const onDataViewCreated = jest.fn();

  const services = getAnalyticsNoDataPageServicesMock();
  const servicesWithCustomBranding = getAnalyticsNoDataPageServicesMockWithCustomBranding();

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
    expect(component.find(Component).props().onDataViewCreated).toBe(onDataViewCreated);
    expect(component.find(Component).props().allowAdHocDataView).toBe(true);
  });

  it('passes correct boolean value to showPlainSpinner', () => {
    const component = mountWithIntl(
      <AnalyticsNoDataPageProvider {...servicesWithCustomBranding}>
        <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} allowAdHocDataView={true} />
      </AnalyticsNoDataPageProvider>
    );

    expect(component.find(Component).length).toBe(1);
    expect(component.find(Component).props().showPlainSpinner).toBe(true);
  });
});
