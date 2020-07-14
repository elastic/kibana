/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

export const WithRoute = (componentRoutePath = '/', onRouter = (router: any) => {}) => (
  WrappedComponent: ComponentType
) => {
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
