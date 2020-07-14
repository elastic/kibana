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
import { BrowserRouter as Router, Route, RouteComponentProps, withRouter } from 'react-router-dom';

import {
  EuiPage,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageSideBar,
  EuiSideNav,
} from '@elastic/eui';
import 'brace/mode/json';
import { AppMountParameters } from '../../../src/core/public';
import { DashboardEmbeddableByValue } from './by_value/embeddable';
import { DashboardStart } from '../../../src/plugins/dashboard/public';

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
  DashboardContainerByValueRenderer: DashboardStart['DashboardContainerByValueRenderer'];
}

const DashboardEmbeddableExplorerApp = ({ basename, DashboardContainerByValueRenderer }: Props) => {
  const pages: PageDef[] = [
    {
      title: 'By value dashboard embeddable',
      id: 'dashboardEmbeddableByValue',
      component: (
        <DashboardEmbeddableByValue
          DashboardContainerByValueRenderer={DashboardContainerByValueRenderer}
        />
      ),
    },
    {
      title: 'By ref dashboard embeddable',
      id: 'dashboardEmbeddableByRef',
      component: <div>TODO: Not implemented, but coming soon...</div>,
    },
  ];

  const routes = pages.map((page, i) => (
    <Route key={i} path={`/${page.id}`} render={(props) => page.component} />
  ));

  return (
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
  );
};

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<DashboardEmbeddableExplorerApp {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
