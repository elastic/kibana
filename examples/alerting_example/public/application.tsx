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

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, withRouter, RouteComponentProps } from 'react-router-dom';
import { EuiPage, EuiPageSideBar, EuiSideNav } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { Page } from './page';
import { DocumentationPage } from './documentation';
import { CreateAlertPage } from './create_alert';
import { ViewAlertPage } from './view_alert';

interface PageDef {
  title: string;
  id: string;
  component: React.ReactNode;
}

type NavProps = RouteComponentProps & {
  pages: PageDef[];
};

const Nav = withRouter(({ history, pages }: NavProps) => {
  const navItems = pages.map(page => ({
    id: page.id,
    name: page.title,
    onClick: () => history.push(`/${page.id}`),
    'data-test-subj': page.id,
  }));

  return (
    <EuiSideNav
      items={[
        {
          name: 'Alerting example',
          id: 'home',
          items: [...navItems],
        },
      ]}
    />
  );
});

export interface AlertingExampleComponentParams {
  application: CoreStart['application'];
  http: CoreStart['http'];
  basename: string;
}

const AlertingExampleApp = ({ basename, http }: AlertingExampleComponentParams) => {
  const pages: PageDef[] = [
    {
      id: 'home',
      title: 'Home',
      component: <DocumentationPage />,
    },
    {
      id: 'create',
      title: 'Create',
      component: <CreateAlertPage http={http} />,
    },
  ];

  const routes = pages.map((page, i) => (
    <Route
      key={i}
      path={`/${page.id}`}
      render={() => <Page title={page.title}>{page.component}</Page>}
    />
  ));

  return (
    <Router basename={basename}>
      <EuiPage>
        <EuiPageSideBar>
          <Nav pages={pages} />
        </EuiPageSideBar>
        <Route path="/" exact render={DocumentationPage} />
        <Route
          path={`/alert/:id`}
          render={(props: RouteComponentProps<{ id: string }>) => {
            return (
              <Page title={`View Alert ${props.match.params.id}`}>
                <ViewAlertPage http={http} id={props.match.params.id} />
              </Page>
            );
          }}
        />
        {routes}
      </EuiPage>
    </Router>
  );
};

export const renderApp = (
  coreStart: CoreStart,
  deps: any,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <AlertingExampleApp
      basename={appBasePath}
      application={coreStart.application}
      http={coreStart.http}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
