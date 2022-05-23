/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { EuiLoadingElastic } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { SharedUxServicesProvider, mockServicesFactory } from '@kbn/shared-ux-services';
import { NoDataViewsPrompt } from '@kbn/shared-ux-prompt-no-data-views';

import { KibanaNoDataPage } from './kibana_no_data_page';
import { NoDataConfigPage } from '../page_template';

describe('Kibana No Data Page', () => {
  const noDataConfig = {
    solution: 'Analytics',
    pageTitle: 'Analytics',
    logo: 'logoKibana',
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

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders NoDataConfigPage', async () => {
    const services = mockServicesFactory({ config: { ...config, hasESData: false } });
    const component = mountWithIntl(
      <SharedUxServicesProvider {...services}>
        <KibanaNoDataPage noDataConfig={noDataConfig} onDataViewCreated={onDataViewCreated} />
      </SharedUxServicesProvider>
    );

    await act(() => new Promise(setImmediate));
    component.update();

    expect(component.find(NoDataConfigPage).length).toBe(1);
    expect(component.find(NoDataViewsPrompt).length).toBe(0);
  });

  test('renders NoDataViews', async () => {
    const services = mockServicesFactory({ config: { ...config, hasESData: true } });
    const component = mountWithIntl(
      <SharedUxServicesProvider {...services}>
        <KibanaNoDataPage noDataConfig={noDataConfig} onDataViewCreated={onDataViewCreated} />
      </SharedUxServicesProvider>
    );

    await act(() => new Promise(setImmediate));
    component.update();

    expect(component.find(NoDataViewsPrompt).length).toBe(1);
    expect(component.find(NoDataConfigPage).length).toBe(0);
  });

  test('renders loading indicator', async () => {
    const dataCheck = () => new Promise<boolean>((resolve, reject) => {});
    const services = {
      ...mockServicesFactory(),
      data: {
        hasESData: dataCheck,
        hasUserDataView: dataCheck,
        hasDataView: dataCheck,
      },
    };
    const component = mountWithIntl(
      <SharedUxServicesProvider {...services}>
        <KibanaNoDataPage noDataConfig={noDataConfig} onDataViewCreated={onDataViewCreated} />
      </SharedUxServicesProvider>
    );

    await act(() => new Promise(setImmediate));
    component.update();

    expect(component.find(EuiLoadingElastic).length).toBe(1);
    expect(component.find(NoDataViewsPrompt).length).toBe(0);
    expect(component.find(NoDataConfigPage).length).toBe(0);
  });
});
