/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { KibanaNoDataPage } from '@kbn/shared-ux-components';
import { AnalyticsNoDataPage } from './analytics_no_data_page.component';

describe('AnalyticsNoDataPageComponent', () => {
  const onDataViewCreated = jest.fn();

  it('renders correctly', () => {
    const component = mountWithIntl(
      <AnalyticsNoDataPage
        onDataViewCreated={onDataViewCreated}
        kibanaGuideDocLink={'http://www.test.com'}
      />
    );
    expect(component).toMatchSnapshot();

    expect(component.find(KibanaNoDataPage).length).toBe(1);

    const noDataConfig = component.find(KibanaNoDataPage).props().noDataConfig;
    expect(noDataConfig.solution).toEqual('Analytics');
    expect(noDataConfig.pageTitle).toEqual('Welcome to Analytics!');
    expect(noDataConfig.logo).toEqual('logoKibana');
    expect(noDataConfig.docsLink).toEqual('http://www.test.com');
    expect(noDataConfig.action.elasticAgent).not.toBeNull();
  });
});
