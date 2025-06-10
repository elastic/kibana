/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { History } from 'history';
import React from 'react';
import ReactDOM from 'react-dom';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Router, Route } from '@kbn/shared-ux-router';

import {
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageSidebar,
  EuiTitle,
  EuiSideNav,
} from '@elastic/eui';

import { CoreStart, AppMountParameters } from '@kbn/core/public';

const Home = () => (
  <EuiPageBody data-test-subj="barAppHome">
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Welcome to Bar!</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageSection>
      <EuiPageHeader>
        <EuiTitle>
          <h2>Bar home page section</h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageSection>It feels so homey!</EuiPageSection>
    </EuiPageSection>
  </EuiPageBody>
);

const PageB = ({ location }: RouteComponentProps) => {
  const searchParams: any[] = [];
  new URLSearchParams(location.search).forEach((value, key) => searchParams.push([key, value]));

  return (
    <EuiPageBody data-test-subj="barAppPageB">
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Page B</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageSection>
        <EuiPageHeader>
          <EuiTitle>
            <h2>
              Search params:{' '}
              <span data-test-subj="barAppPageBQuery">{JSON.stringify(searchParams)}</span>
            </h2>
          </EuiTitle>
        </EuiPageHeader>
      </EuiPageSection>
    </EuiPageBody>
  );
};

type NavProps = RouteComponentProps & {
  navigateToApp: CoreStart['application']['navigateToApp'];
};
const Nav = withRouter(({ history, navigateToApp }: NavProps) => (
  <EuiSideNav
    items={[
      {
        name: 'Bar',
        id: 'bar',
        items: [
          {
            id: 'home',
            name: 'Home',
            onClick: () => navigateToApp('bar', { path: '' }),
            'data-test-subj': 'barNavHome',
          },
          {
            id: 'page-b',
            name: 'Page B',
            onClick: () => history.push('/page-b', { bar: 'page-b' }),
            'data-test-subj': 'barNavPageB',
          },
          {
            id: 'linktofoo',
            name: 'Open Foo',
            onClick: () => navigateToApp('foo'),
            'data-test-subj': 'barNavFooHome',
          },
        ],
      },
    ]}
  />
));

const BarApp = ({ history, coreStart }: { history: History; coreStart: CoreStart }) => (
  <Router history={history}>
    <EuiPage>
      <EuiPageSidebar>
        <Nav navigateToApp={coreStart.application.navigateToApp} />
      </EuiPageSidebar>
      <Route path="/" exact component={Home} />
      <Route path="/page-b" component={PageB} />
    </EuiPage>
  </Router>
);

export const renderApp = (coreStart: CoreStart, { history, element }: AppMountParameters) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <BarApp history={history} coreStart={coreStart} />
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
