/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount as enzymeMount, ReactWrapper } from 'enzyme';

import { ServicesProvider, SharedUXServices } from '../../../../services';
import { servicesFactory } from '../../../../services/mocks';
import { QuickButtonGroup } from './quick_group';

describe('<QuickButtonGroup />', () => {
  let services: SharedUXServices;
  let mount: (element: JSX.Element) => ReactWrapper;

  beforeEach(() => {
    services = servicesFactory();
    mount = (element: JSX.Element) =>
      enzymeMount(<ServicesProvider {...services}>{element}</ServicesProvider>);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('is rendered', () => {
    const component = mount(
      <QuickButtonGroup
        legend="Legend"
        buttons={[
          {
            label: 'Text',
            onClick: jest.fn(),
            iconType: 'visText',
          },
        ]}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
