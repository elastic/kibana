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
import { withRouter, RouteComponentProps, Redirect } from 'react-router-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Router, Route } from '@kbn/shared-ux-router';

import {
  EuiPage,
  EuiPageSidebar,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiSideNav,
} from '@elastic/eui';

import { CoreStart, AppMountParameters } from '@kbn/core/public';

const Home = () => (
  <EuiPageBody data-test-subj="dlAppHome">
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Welcome to DL!</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageSection>
      <EuiPageHeader>
        <EuiTitle>
          <h2>DL home page section title</h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageSection>Wow this is the content!</EuiPageSection>
    </EuiPageSection>
  </EuiPageBody>
);

const PageA = () => (
  <EuiPageBody data-test-subj="dlAppPageA">
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>DL page A</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageSection>
      <EuiPageHeader>
        <EuiTitle>
          <h2>DL Page A section title</h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageSection>DL Page A&apos;s content goes here</EuiPageSection>
    </EuiPageSection>
  </EuiPageBody>
);

const PageB = () => (
  <EuiPageBody data-test-subj="dlAppPageB">
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>DL page B</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageSection>
      <EuiPageHeader>
        <EuiTitle>
          <h2>DL Page B section title</h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageSection>DL Page B&apos;s content goes here</EuiPageSection>
    </EuiPageSection>
  </EuiPageBody>
);

type NavProps = RouteComponentProps & {
  navigateToApp: CoreStart['application']['navigateToApp'];
};
const Nav = withRouter(({ history, navigateToApp }: NavProps) => (
  <EuiSideNav
    items={[
      {
        name: 'DeepLinks!',
        id: 'deeplinks',
        items: [
          {
            id: 'home',
            name: 'DL Home',
            onClick: () => history.push('/home'),
            'data-test-subj': 'dlNavHome',
          },
          {
            id: 'page-a',
            name: 'DL page A',
            onClick: () => history.push('/page-a'),
            'data-test-subj': 'dlNavPageA',
          },
          {
            id: 'navigateDeepByPath',
            name: 'DL section 1 page B',
            onClick: () => {
              navigateToApp('deeplinks', { path: '/page-b' });
            },
            'data-test-subj': 'dlNavDeepPageB',
          },
          {
            id: 'navigateDeepById',
            name: 'DL page A deep link',
            onClick: () => {
              navigateToApp('deeplinks', { deepLinkId: 'pageA' });
            },
            'data-test-subj': 'dlNavDeepPageAById',
          },
        ],
      },
    ]}
  />
));

const DlApp = ({ history, coreStart }: { history: History; coreStart: CoreStart }) => (
  <Router history={history}>
    <EuiPage>
      <EuiPageSidebar>
        <Nav navigateToApp={coreStart.application.navigateToApp} />
      </EuiPageSidebar>
      <Route path="/" exact render={() => <Redirect to="/home" />} />
      <Route path="/home" exact component={Home} />
      <Route path="/page-a" component={PageA} />
      <Route path="/page-b" component={PageB} />
    </EuiPage>
  </Router>
);

export const renderApp = (coreStart: CoreStart, { history, element }: AppMountParameters) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <DlApp history={history} coreStart={coreStart} />
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
