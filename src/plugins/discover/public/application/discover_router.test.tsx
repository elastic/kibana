/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { Redirect, RouteProps } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { createSearchSessionMock } from '../__mocks__/search_session';
import { discoverServiceMock as mockDiscoverServices } from '../__mocks__/services';
import { DiscoverRoutes } from './discover_router';
import { DiscoverMainRoute } from './main';
import { SingleDocRoute } from './doc';
import { ContextAppRoute } from './context';
import { mockCustomizationContext } from '../customizations/__mocks__/customization_context';
import { MainRouteProps } from './main/discover_main_route';

let pathMap: Record<string, never> = {};

const gatherRoutes = (wrapper: ShallowWrapper) => {
  wrapper.find(Route).forEach((route) => {
    const routeProps = route.props() as RouteProps;
    const path = routeProps.path;
    const children = routeProps.children;
    if (typeof path === 'string') {
      // @ts-expect-error
      pathMap[path] = children ?? routeProps.render;
    }
  });
};

const mockExperimentalFeatures = {};

const props: MainRouteProps = {
  customizationContext: mockCustomizationContext,
};

describe('DiscoverRouter', () => {
  beforeAll(() => {
    pathMap = {};
    const { history } = createSearchSessionMock();
    const component = shallow(
      <DiscoverRoutes
        services={mockDiscoverServices}
        history={history}
        customizationContext={mockCustomizationContext}
        experimentalFeatures={mockExperimentalFeatures}
      />
    );
    gatherRoutes(component);
  });

  it('should show DiscoverMainRoute component for / route', () => {
    expect(pathMap['/']).toMatchObject(<DiscoverMainRoute {...props} />);
  });

  it('should show DiscoverMainRoute component for /view/:id route', () => {
    expect(pathMap['/view/:id']).toMatchObject(<DiscoverMainRoute {...props} />);
  });

  it('should show Redirect component for /doc/:dataView/:index/:type route', () => {
    const redirectParams = {
      match: {
        params: {
          dataView: '123',
          index: '456',
        },
      },
    };
    const redirect = pathMap['/doc/:dataView/:index/:type'] as Function;
    expect(typeof redirect).toBe('function');
    expect(redirect(redirectParams)).toMatchObject(<Redirect to="/doc/123/456" />);
  });

  it('should show SingleDocRoute component for /doc/:dataViewId/:index route', () => {
    expect(pathMap['/doc/:dataViewId/:index']).toMatchObject(<SingleDocRoute />);
  });

  it('should show ContextAppRoute component for /context/:dataViewId/:id route', () => {
    expect(pathMap['/context/:dataViewId/:id']).toMatchObject(<ContextAppRoute />);
  });
});
