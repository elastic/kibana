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

import { NoDataViewsPromptServices } from '@kbn/shared-ux-prompt-no-data-views-types';
import { getNoDataViewsPromptServicesMock } from '@kbn/shared-ux-prompt-no-data-views-mocks';

import { NoDataViewsPrompt } from './no_data_views';
import { NoDataViewsPromptProvider } from './services';

describe('<NoDataViewsPromptTest />', () => {
  let services: NoDataViewsPromptServices;
  let mount: (element: JSX.Element) => ReactWrapper;

  beforeEach(() => {
    services = getNoDataViewsPromptServicesMock();
    mount = (element: JSX.Element) =>
      mountWithIntl(<NoDataViewsPromptProvider {...services}>{element}</NoDataViewsPromptProvider>);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('on dataView created', () => {
    const component = mount(<NoDataViewsPrompt onDataViewCreated={jest.fn()} />);

    expect(services.openDataViewEditor).not.toHaveBeenCalled();
    component.find('button').simulate('click');

    component.unmount();

    expect(services.openDataViewEditor).toHaveBeenCalled();
  });
});
