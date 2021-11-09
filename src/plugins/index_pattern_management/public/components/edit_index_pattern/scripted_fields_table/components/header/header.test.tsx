/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { RouteComponentProps } from 'react-router-dom';
import { ScopedHistory } from 'kibana/public';
import { scopedHistoryMock } from '../../../../../../../../core/public/mocks';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { mockManagementPlugin } from '../../../../../mocks';

import { Header } from './header';

describe('Header', () => {
  const mockedContext = mockManagementPlugin.createIndexPatternManagmentContext();
  test('should render normally', () => {
    const component = mount(
      <Header.WrappedComponent
        indexPatternId="test"
        history={scopedHistoryMock.create() as unknown as ScopedHistory}
        location={{} as unknown as RouteComponentProps['location']}
        match={{} as unknown as RouteComponentProps['match']}
      />,
      {
        wrappingComponent: KibanaContextProvider,
        wrappingComponentProps: {
          services: mockedContext,
        },
      }
    );

    expect(component).toMatchSnapshot();
  });
});
