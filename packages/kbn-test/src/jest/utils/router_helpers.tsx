/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Component, ComponentType } from 'react';
import { MemoryRouter, Route, withRouter } from 'react-router-dom';
import * as H from 'history';

export const WithMemoryRouter = (initialEntries: string[] = ['/'], initialIndex: number = 0) => (
  WrappedComponent: ComponentType
) => (props: any) => (
  <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
    <WrappedComponent {...props} />
  </MemoryRouter>
);

export const WithRoute = (
  componentRoutePath: string | string[] = '/',
  onRouter = (router: any) => {}
) => (WrappedComponent: ComponentType) => {
  // Create a class component that will catch the router
  // and forward it to our "onRouter()" handler.
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
    <Route
      path={componentRoutePath}
      render={(routerProps) => <CatchRouter {...routerProps} {...props} />}
    />
  );
};

interface Router {
  history: Partial<H.History>;
  route: {
    location: H.Location;
  };
}

export const reactRouterMock: Router = {
  history: {
    push: () => {},
    createHref: (location) => location.pathname!,
    location: {
      pathname: '',
      search: '',
      state: '',
      hash: '',
    },
  },
  route: {
    location: {
      pathname: '',
      search: '',
      state: '',
      hash: '',
    },
  },
};
