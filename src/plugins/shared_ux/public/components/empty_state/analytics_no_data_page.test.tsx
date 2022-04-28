/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { mockServicesFactory } from '@kbn/shared-ux-services';
import { AnalyticsNoDataPageComponent } from './analytics_no_data_page.component';
import { AnalyticsNoDataPage } from './analytics_no_data_page';

jest.mock('../../plugin', () => ({
  getSharedUXServices: () => mockServicesFactory(),
}));

describe('AnalyticsNoDataPage', () => {
  const onDataViewCreated = jest.fn();

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', async () => {
    const component = mountWithIntl(<AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} />);

    expect(component).toMatchSnapshot();

    expect(component.find(AnalyticsNoDataPageComponent).length).toBe(1);
    expect(component.find(AnalyticsNoDataPageComponent).props().kibanaGuideDocLink).toBe(
      mockServicesFactory().docLinks.kibanaGuideDocLink
    );
    expect(component.find(AnalyticsNoDataPageComponent).props().onDataViewCreated).toBe(
      onDataViewCreated
    );
  });
});
