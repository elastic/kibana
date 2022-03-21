/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiButton } from '@elastic/eui';

import {
  SharedUxServicesProvider,
  SharedUxServices,
  mockServicesFactory,
} from '@kbn/shared-ux-services';
import { NoDataViews } from './no_data_views';

describe('<NoDataViewsPageTest />', () => {
  let services: SharedUxServices;
  let mount: (element: JSX.Element) => ReactWrapper;

  beforeEach(() => {
    services = mockServicesFactory();
    mount = (element: JSX.Element) =>
      mountWithIntl(<SharedUxServicesProvider {...services}>{element}</SharedUxServicesProvider>);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('on dataView created', () => {
    const component = mount(<NoDataViews onDataViewCreated={jest.fn()} />);

    expect(services.editors.openDataViewEditor).not.toHaveBeenCalled();
    component.find(EuiButton).simulate('click');

    component.unmount();

    expect(services.editors.openDataViewEditor).toHaveBeenCalled();
  });
});
