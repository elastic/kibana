/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { waitFor } from '@testing-library/dom';
import { act } from 'react-dom/test-utils';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { SharedUxServicesProvider, mockServicesFactory } from '@kbn/shared-ux-services';

import { EmptyStatePage } from './empty_state_page';
import { NoDataConfigPage } from '../page_template';
import { NoDataViews } from './no_data_views';

describe('empty state page', () => {
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
    hasESData: true,
    hasDataView: false,
    hasUserDataView: false,
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders NoDataPage', async () => {
    const services = mockServicesFactory({ config: { ...config, hasESData: false } });
    const component = mountWithIntl(
      <SharedUxServicesProvider {...services}>
        <EmptyStatePage noDataConfig={noDataConfig} onDataViewCreated={onDataViewCreated} />
      </SharedUxServicesProvider>
    );

    await waitFor(() => {
      expect(component).toMatchSnapshot();
      expect(component.find(NoDataConfigPage).length).toBe(1);
      expect(component.find(NoDataViews).length).toBe(0);
    });
  });

  test('renders NoDataViews', async () => {
    const services = mockServicesFactory({ config });
    const component = mountWithIntl(
      <SharedUxServicesProvider {...services}>
        <EmptyStatePage noDataConfig={noDataConfig} onDataViewCreated={onDataViewCreated} />
      </SharedUxServicesProvider>
    );

    await act(() => new Promise(setImmediate));
    component.update();

    expect(component).toMatchSnapshot();
    expect(component.find(NoDataViews).length).toBe(1);
    expect(component.find(NoDataConfigPage).length).toBe(0);
  });
});
