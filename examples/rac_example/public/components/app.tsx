/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BrowserRouter as Router, Route, withRouter, RouteComponentProps } from 'react-router-dom';
import { EuiPage, EuiSideNav, EuiPageSideBar } from '@elastic/eui';
import { CoreStart } from '../../../../src/core/public';
import { TriggersAndActionsUIPublicPluginStart } from '../../../../x-pack/plugins/triggers_actions_ui/public';
import { CreateRule } from './create_rule';

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

interface RacExampleAppDeps {
  basename: string;
  http: CoreStart['http'];
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  navigateToApp: CoreStart['application']['navigateToApp'];
}

export const RacExample: React.FC<RacExampleAppDeps> = ({
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
