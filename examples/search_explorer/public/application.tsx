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

import {
  EuiPage,
  EuiPageSideBar,
  // @ts-ignore
  EuiSideNav,
} from '@elastic/eui';

import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { EsSearchTest } from './es_strategy';
import { Page } from './page';
import { DemoStrategy } from './demo_strategy';
import { DocumentationPage } from './documentation';
import { SearchApiPage } from './search_api';
import { AppPluginStartDependencies, SearchBarComponentParams } from './types';

const Home = () => <DocumentationPage />;

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
          name: 'Search explorer',
          id: 'home',
          items: [...navItems],
        },
      ]}
    />
  );
});

const buildPage = (page: PageDef) => <Page title={page.title}>{page.component}</Page>;

const SearchApp = ({ basename, data, application }: SearchBarComponentParams) => {
  const pages: PageDef[] = [
    {
      id: 'home',
      title: 'Home',
      component: <Home />,
    },
    {
      title: 'Search API',
      id: 'searchAPI',
      component: <SearchApiPage />,
    },
    {
      title: 'ES search strategy',
      id: 'esSearch',
      component: <EsSearchTest search={data.search.search} />,
    },
    {
      title: 'Demo search strategy',
      id: 'demoSearch',
      component: <DemoStrategy search={data.search.search} />,
    },
  ];

  const routes = pages.map((page, i) => (
    <Route key={i} path={`/${page.id}`} render={props => buildPage(page)} />
  ));

  return (
    <Router basename={basename}>
      <EuiPage>
        <EuiPageSideBar>
          <Nav navigateToApp={application.navigateToApp} pages={pages} />
        </EuiPageSideBar>
        <Route path="/" exact component={Home} />
        {routes}
      </EuiPage>
    </Router>
  );
};

export const renderApp = (
  coreStart: CoreStart,
  deps: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <SearchApp basename={appBasePath} data={deps.data} application={coreStart.application} />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
