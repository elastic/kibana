/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, ComponentType } from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import { History, Location, To, InitialEntry } from 'history';

const stringifyPath = (path: To): string => {
  if (typeof path === 'string') {
    return path;
  }

  return path.pathname || '/';
};

const locationDescriptorToRoutePath = (paths: To): string => {
  return stringifyPath(paths);
};

export const WithMemoryRouter =
  (initialEntries: InitialEntry[] = ['/'], initialIndex: number = 0) =>
  (WrappedComponent: ComponentType) =>
  (props: any) =>
    (
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        <WrappedComponent {...props} />
      </MemoryRouter>
    );

export const WithRoute =
  (componentRoutePath: InitialEntry = '/', onRouter = (router: any) => {}) =>
  (WrappedComponent: ComponentType) => {
    // Create a class component that will catch the router
    // and forward it to our "onRouter()" handler.
    // TODO: withRouter is no longer a thing, need to use FC/hooks instead AND stop accessing history or router
    //       as those are no longer exported by react-router-dom
    const CatchRouter = withRouter(
      class extends Component<any> {
        componentDidMount() {
          const { match, location, history } = this.props;
          const router = { route: { match, location }, history };
          onRouter(router);
        }

        render() {
          return <WrappedComponent {...this.props} />;
        }
      }
    );

    return (props: any) => (
      <Route path={locationDescriptorToRoutePath(componentRoutePath)}>
        <CatchRouter {...props} />
      </Route>
    );
  };

interface Router {
  history: Partial<History>;
  route: {
    location: Location;
  };
}

export const reactRouterMock: Router = {
  history: {
    push: () => {},
    createHref: (location) => (typeof location === 'string' ? location : location.pathname!),
    location: {
      key: 'default',
      pathname: '',
      search: '',
      state: {},
      hash: '',
    },
  },
  route: {
    location: {
      key: 'default',
      pathname: '',
      search: '',
      state: {},
      hash: '',
    },
  },
};
