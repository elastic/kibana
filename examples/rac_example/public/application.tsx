/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, withRouter, RouteComponentProps } from 'react-router-dom';
import { EuiPage, EuiSideNav, EuiPageSideBar } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { AlertsDemoClientStartDeps } from './types';
import { KibanaContextProvider } from '../../../src/plugins/kibana_react/public';
import { TriggersAndActionsUIPublicPluginStart } from '../../../x-pack/plugins/triggers_actions_ui/public';
import { CreateRule } from './components/create_rule';
import { RacExamplePage } from '../common/rac_page';

interface PageDef {
  title: string;
  id: string;
  component: React.ReactNode;
}

type NavProps = RouteComponentProps & {
  navigateToApp: CoreStart['application']['navigateToApp'];
  pages: PageDef[];
};

const Nav = withRouter(({ history, navigateToApp, pages }: NavProps) => {
  const navItems = pages.map((page) => ({
    id: page.id,
    name: page.title,
    onClick: () => history.push(`/${page.id}`),
    'data-test-subj': page.id,
  }));

  return (
    <EuiSideNav
      items={[
        {
          name: 'RAC example',
          id: 'home',
          items: [...navItems],
        },
      ]}
    />
  );
});

export const renderApp = (
  core: CoreStart,
  plugins: AlertsDemoClientStartDeps,
  { appBasePath, element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      {/* <RacExamplePage basePath={core.http.basePath}> */}
      <AlertsDemoApp
        basename={appBasePath}
        http={core.http}
        triggersActionsUi={plugins.triggersActionsUi}
        navigateToApp={core.application.navigateToApp}
      />
      {/* </RacExamplePage> */}
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};

interface AlertsDemoAppDeps {
  basename: string;
  http: CoreStart['http'];
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  navigateToApp: CoreStart['application']['navigateToApp'];
}

const AlertsDemoApp: React.FC<AlertsDemoAppDeps> = ({
  basename,
  triggersActionsUi,
  navigateToApp,
}) => {
  const pages: PageDef[] = [
    {
      title: 'Create rule',
      id: 'createRule',
      component: <CreateRule triggersActionsUi={triggersActionsUi} />,
    },
    {
      title: 'Developer Guide',
      id: 'developerGuide',
      component: <h1>Developer guide</h1>,
    },
  ];

  const routes = pages.map((page, i) => (
    <Route key={i} path={`/${page.id}`} render={(props) => page.component} />
  ));
  return (
    <Router basename={basename}>
      <EuiPage>
        <EuiPageSideBar>
          <Nav navigateToApp={navigateToApp} pages={pages} />
        </EuiPageSideBar>
        {routes}
      </EuiPage>
    </Router>
  );
};
