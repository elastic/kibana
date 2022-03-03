/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiButton } from '@elastic/eui';

import { ServicesProvider, SharedUXServices } from '../../../services';
import { servicesFactory } from '../../../services/mocks';
import { NoDataViews } from './no_data_views';

describe('<NoDataViewsPageTest />', () => {
  let services: SharedUXServices;

  beforeEach(() => {
    services = servicesFactory();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('on dataView created', async () => {
    const component = mountWithIntl(
      <ServicesProvider {...services}>
        <NoDataViews
          onDataViewCreated={jest.fn()}
          dataViewsDocLink={services.docLinks.dataViewsDocsLink}
        />
      </ServicesProvider>
    );

    expect(services.editors.openDataViewEditor).not.toHaveBeenCalled();
    component.find(EuiButton).simulate('click');

    component.unmount();

    expect(services.editors.openDataViewEditor).toHaveBeenCalled();
  });
});
