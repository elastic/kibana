/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { discoverServiceMock } from '../../../__mocks__/services';
import { DiscoverMainProps, DiscoverMainRoute } from './discover_main_route';
import React from 'react';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { KibanaContextProvider } from '../../../../../kibana_react/public';
import { mount } from 'enzyme';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    id: undefined,
  }),
}));

describe('DiscoverMainRoute', () => {
  function mountComponent(incomingProps?: DiscoverMainProps) {
    const services = discoverServiceMock;
    const { history } = createSearchSessionMock();
    const props = { ...(incomingProps || {}), services, history };
    const wrappingComponent: React.FC<{
      children: React.ReactNode;
    }> = ({ children }) => {
      return <KibanaContextProvider services={services}>{children}</KibanaContextProvider>;
    };
    const component = mount(<DiscoverMainRoute {...props} />, { wrappingComponent });
    return { component, props, services };
  }

  it('renders loading spinner if no saved search', () => {
    const { component } = mountComponent();
    expect(component).toMatchSnapshot();
  });
});
