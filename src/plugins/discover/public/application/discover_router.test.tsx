/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { shallow } from 'enzyme';
import { Route, RouteProps } from 'react-router-dom';
import { createSearchSessionMock } from '../__mocks__/search_session';
import { discoverServiceMock as mockDiscoverServices } from '../__mocks__/services';
import { discoverRouter } from './discover_router';
import { DiscoverMainRoute } from './main';
import { SingleDocRoute } from './doc';
import { ContextAppRoute } from './context';

const pathMap: Record<string, never> = {};

describe('Discover router', () => {
  beforeAll(() => {
    const { history } = createSearchSessionMock();
    const component = shallow(discoverRouter(mockDiscoverServices, history));
    component.find(Route).forEach((route) => {
      const routeProps = route.props() as RouteProps;
      const path = routeProps.path;
      const children = routeProps.children;
      if (typeof path === 'string') {
        // @ts-expect-error
        pathMap[path] = children;
      }
    });
  });

  it('should show DiscoverMainRoute component for / route', () => {
    expect(pathMap['/']).toMatchObject(<DiscoverMainRoute />);
  });

  it('should show DiscoverMainRoute component for /view/:id route', () => {
    expect(pathMap['/view/:id']).toMatchObject(<DiscoverMainRoute />);
  });

  it('should show SingleDocRoute component for /doc/:indexPatternId/:index route', () => {
    expect(pathMap['/doc/:indexPatternId/:index']).toMatchObject(<SingleDocRoute />);
  });

  it('should show ContextAppRoute component for /context/:indexPatternId/:id route', () => {
    expect(pathMap['/context/:indexPatternId/:id']).toMatchObject(<ContextAppRoute />);
  });
});
