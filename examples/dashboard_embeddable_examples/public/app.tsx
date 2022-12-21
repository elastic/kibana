/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, RouteComponentProps, withRouter } from 'react-router-dom';

import {
  EuiPage,
  EuiPageContent_Deprecated as EuiPageContent,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiPageSideBar_Deprecated as EuiPageSideBar,
  EuiSideNav,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import 'brace/mode/json';
import { AppMountParameters, IUiSettingsClient } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

interface PageDef {
  title: string;
  id: string;
  component: React.ReactNode;
}

type NavProps = RouteComponentProps & {
  pages: PageDef[];
};

const Nav = withRouter(({ history, pages }: NavProps) => {
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
          name: 'Embeddable explorer',
          id: 'home',
          items: [...navItems],
        },
      ]}
    />
  );
});

interface Props {
  basename: string;
  uiSettings: IUiSettingsClient;
}

const DashboardEmbeddableExplorerApp = ({ basename, uiSettings }: Props) => {
  const pages: PageDef[] = [
    {
      title: 'Portable Dashboard basic embeddable example',
      id: 'portableDashboardEmbeddableBasicExample',
      component: (
        <EuiTitle>
          <EuiText>Portable Dashboard embeddable examples coming soon!</EuiText>
        </EuiTitle>
      ),
    },
  ];

  const routes = pages.map((page, i) => (
    <Route key={i} path={`/${page.id}`} render={(props) => page.component} />
  ));

  return (
    <KibanaContextProvider services={{ uiSettings }}>
      <Router basename={basename}>
        <EuiPage>
          <EuiPageSideBar>
            <Nav pages={pages} />
          </EuiPageSideBar>
          <EuiPageContent>
            <EuiPageContentBody>{routes}</EuiPageContentBody>
          </EuiPageContent>
        </EuiPage>
      </Router>
    </KibanaContextProvider>
  );
};

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<DashboardEmbeddableExplorerApp {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
