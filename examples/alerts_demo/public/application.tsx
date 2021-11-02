/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { /* EuiSideNav,*/ EuiPage } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { AlertsDemoClientStartDeps } from './types';
import {
  KibanaContextProvider,
  /* KibanaPageTemplate, */
} from '../../../src/plugins/kibana_react/public';
import { TriggersAndActionsUIPublicPluginStart } from '../../../x-pack/plugins/triggers_actions_ui/public';
import { CreateRule } from './components/create_rule';

/* function AlertsDemoPageTemplate({ children, ...rest }) {
  const items = [
    {
      name: 'Section1',
      id: 'home',
      items: [
        {
          name: 'nav item1',
        },
        {
          name: 'nav item2',
        },
      ],
    },
    {
      name: 'Section2',
      id: 'about',
      items: [
        {
          name: 'nav item1',
        },
        {
          name: 'nav item2',
        },
      ],
    },
  ];
  const sideNav = <EuiSideNav heading="Sidebar" items={items} />;
  return <KibanaPageTemplate pageSideBar={sideNav}>{children}</KibanaPageTemplate>;
}*/

export const renderApp = (
  core: CoreStart,
  plugins: AlertsDemoClientStartDeps,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <AlertsDemoApp
        basename={appBasePath}
        http={core.http}
        triggersActionsUi={plugins.triggersActionsUi}
      />
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};

interface AlertsDemoAppDeps {
  basename: string;
  http: CoreStart['http'];
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

const AlertsDemoApp: React.FC<AlertsDemoAppDeps> = ({ basename, triggersActionsUi }) => {
  return (
    <Router basename={basename}>
      <EuiPage>
        <Route
          path="/"
          exact={true}
          render={() => <CreateRule triggersActionsUi={triggersActionsUi} />}
        />
        <Route path={`/rule/:id`} render={(props) => <h1>Rule info</h1>} />
      </EuiPage>
    </Router>
  );
};
