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

import { EmbeddableStart } from '../../../src/plugins/embeddable/public';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { Start as InspectorStartContract } from '../../../src/plugins/inspector/public';
import {
  AppMountContext,
  AppMountParameters,
  CoreStart,
  SavedObjectsStart,
  IUiSettingsClient,
  OverlayStart,
} from '../../../src/core/public';
import { HelloWorldEmbeddableExample } from './hello_world_embeddable_example';
import { TodoEmbeddableExample } from './todo_embeddable_example';
import { ListContainerExample } from './list_container_example';
import { EmbeddablePanelExample } from './embeddable_panel_example';
import { EmbeddableExamplesStart } from '../../embeddable_examples/public/plugin';

interface PageDef {
  title: string;
  id: string;
  component: React.ReactNode;
}

type NavProps = RouteComponentProps & {
  navigateToApp: AppMountContext['core']['application']['navigateToApp'];
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
  navigateToApp: CoreStart['application']['navigateToApp'];
  embeddableApi: EmbeddableStart;
  uiActionsApi: UiActionsStart;
  overlays: OverlayStart;
  notifications: CoreStart['notifications'];
  inspector: InspectorStartContract;
  savedObject: SavedObjectsStart;
  uiSettingsClient: IUiSettingsClient;
  embeddableExamples: EmbeddableExamplesStart;
}

const EmbeddableExplorerApp = ({
  basename,
  navigateToApp,
  embeddableApi,
  embeddableExamples,
}: Props) => {
  const pages: PageDef[] = [
    {
      title: 'Hello world embeddable',
      id: 'helloWorldEmbeddableSection',
      component: (
        <HelloWorldEmbeddableExample
          helloWorldEmbeddableFactory={embeddableExamples.factories.getHelloWorldEmbeddableFactory()}
        />
      ),
    },
    {
      title: 'Todo embeddable',
      id: 'todoEmbeddableSection',
      component: (
        <TodoEmbeddableExample
          todoEmbeddableFactory={embeddableExamples.factories.getTodoEmbeddableFactory()}
        />
      ),
    },
    {
      title: 'List container embeddable',
      id: 'listContainerSection',
      component: (
        <ListContainerExample
          listContainerEmbeddableFactory={embeddableExamples.factories.getListContainerEmbeddableFactory()}
          searchableListContainerEmbeddableFactory={embeddableExamples.factories.getSearchableListContainerEmbeddableFactory()}
        />
      ),
    },
    {
      title: 'Dynamically adding children to a container',
      id: 'embeddablePanelExample',
      component: (
        <EmbeddablePanelExample
          embeddableServices={embeddableApi}
          searchListContainerFactory={embeddableExamples.factories.getSearchableListContainerEmbeddableFactory()}
        />
      ),
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

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<EmbeddableExplorerApp {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
