/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount as enzymeMount, ReactWrapper } from 'enzyme';
import React from 'react';

import {
  SharedUxServicesProvider,
  SharedUxServices,
  mockServicesFactory,
} from '@kbn/shared-ux-services';

import { ToolbarButton } from './primary';

describe('<ToolbarButton />', () => {
  let services: SharedUxServices;
  let mount: (element: JSX.Element) => ReactWrapper;

  beforeEach(() => {
    services = mockServicesFactory();
    mount = (element: JSX.Element) =>
      enzymeMount(<SharedUxServicesProvider {...services}>{element}</SharedUxServicesProvider>);
  });

  test('is rendered', () => {
    const component = mount(<ToolbarButton label="test" />);

    expect(component).toMatchSnapshot();
  });
  test('it can be passed a functional onClick handler', () => {
    const mockHandler = jest.fn();
    const component = mount(<ToolbarButton label="withOnClick" onClick={mockHandler} />);
    component.simulate('click');
    expect(mockHandler).toHaveBeenCalled();
  });
});
