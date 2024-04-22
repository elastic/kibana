/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { Redirect, RouteProps } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { createSearchSessionMock } from '../__mocks__/search_session';
import { discoverServiceMock as mockDiscoverServices } from '../__mocks__/services';
import {
  CustomDiscoverRoutes,
  DiscoverRouter,
  DiscoverRoutes,
  DiscoverRoutesProps,
} from './discover_router';
import { DiscoverMainRoute } from './main';
import { SingleDocRoute } from './doc';
import { ContextAppRoute } from './context';
import { createProfileRegistry } from '../customizations/profile_registry';
import { addProfile } from '../../common/customizations';
import { NotFoundRoute } from './not_found';
import { mockCustomizationContext } from '../customizations/__mocks__/customization_context';

let mockProfile: string | undefined;

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    useParams: () => ({ profile: mockProfile }),
  };
});

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

const props: DiscoverRoutesProps = {
  customizationCallbacks: [],
  customizationContext: mockCustomizationContext,
  experimentalFeatures: mockExperimentalFeatures,
};

describe('DiscoverRoutes', () => {
  describe('Without prefix', () => {
    beforeAll(() => {
      pathMap = {};
      gatherRoutes(shallow(<DiscoverRoutes {...props} />));
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

  const prefix = addProfile('', 'test');

  describe('With prefix', () => {
    beforeAll(() => {
      pathMap = {};
      gatherRoutes(shallow(<DiscoverRoutes prefix={prefix} {...props} />));
    });

    it(`should show DiscoverMainRoute component for ${prefix} route`, () => {
      expect(pathMap[`${prefix}/`]).toMatchObject(<DiscoverMainRoute {...props} />);
    });

    it(`should show DiscoverMainRoute component for ${prefix}/view/:id route`, () => {
      expect(pathMap[`${prefix}/view/:id`]).toMatchObject(<DiscoverMainRoute {...props} />);
    });

    it(`should show Redirect component for ${prefix}/doc/:dataView/:index/:type route`, () => {
      const redirectParams = {
        match: {
          params: {
            dataView: '123',
            index: '456',
          },
        },
      };
      const redirect = pathMap[`${prefix}/doc/:dataView/:index/:type`] as Function;
      expect(typeof redirect).toBe('function');
      expect(redirect(redirectParams)).toMatchObject(<Redirect to={`${prefix}/doc/123/456`} />);
    });

    it(`should show SingleDocRoute component for ${prefix}/doc/:dataViewId/:index route`, () => {
      expect(pathMap[`${prefix}/doc/:dataViewId/:index`]).toMatchObject(<SingleDocRoute />);
    });

    it(`should show ContextAppRoute component for ${prefix}/context/:dataViewId/:id route`, () => {
      expect(pathMap[`${prefix}/context/:dataViewId/:id`]).toMatchObject(<ContextAppRoute />);
    });
  });
});

const profileRegistry = createProfileRegistry();
const callbacks = [jest.fn()];

profileRegistry.set({
  id: 'default',
  customizationCallbacks: callbacks,
});

profileRegistry.set({
  id: 'test',
  customizationCallbacks: callbacks,
});

describe('CustomDiscoverRoutes', () => {
  afterEach(() => {
    mockProfile = undefined;
  });

  it('should show DiscoverRoutes for a valid profile', () => {
    mockProfile = 'test';
    const component = shallow(
      <CustomDiscoverRoutes
        profileRegistry={profileRegistry}
        customizationContext={mockCustomizationContext}
        experimentalFeatures={mockExperimentalFeatures}
      />
    );
    expect(component.find(DiscoverRoutes).getElement()).toMatchObject(
      <DiscoverRoutes
        prefix={addProfile('', mockProfile)}
        customizationCallbacks={callbacks}
        customizationContext={mockCustomizationContext}
        experimentalFeatures={mockExperimentalFeatures}
      />
    );
  });

  it('should show NotFoundRoute for an invalid profile', () => {
    mockProfile = 'invalid';
    const component = shallow(
      <CustomDiscoverRoutes
        profileRegistry={profileRegistry}
        customizationContext={mockCustomizationContext}
        experimentalFeatures={mockExperimentalFeatures}
      />
    );
    expect(component.find(NotFoundRoute).getElement()).toMatchObject(<NotFoundRoute />);
  });
});

const profilePath = addProfile('', ':profile');

describe('DiscoverRouter', () => {
  beforeAll(() => {
    pathMap = {};
    const { history } = createSearchSessionMock();
    const component = shallow(
      <DiscoverRouter
        services={mockDiscoverServices}
        history={history}
        profileRegistry={profileRegistry}
        customizationContext={mockCustomizationContext}
        experimentalFeatures={mockExperimentalFeatures}
      />
    );
    gatherRoutes(component);
  });

  it('should show DiscoverRoutes component for / route', () => {
    expect(pathMap['/']).toMatchObject(
      <DiscoverRoutes
        customizationCallbacks={callbacks}
        customizationContext={mockCustomizationContext}
        experimentalFeatures={mockExperimentalFeatures}
      />
    );
  });

  it(`should show CustomDiscoverRoutes component for ${profilePath} route`, () => {
    expect(pathMap[profilePath]).toMatchObject(
      <CustomDiscoverRoutes
        profileRegistry={profileRegistry}
        customizationContext={mockCustomizationContext}
        experimentalFeatures={mockExperimentalFeatures}
      />
    );
  });
});
