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

import { EuiPage, EuiPageSideBar, EuiSideNav } from '@elastic/eui';

import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import {
  AppMountParameters,
  CoreStart,
  SavedObjectsStart,
  IUiSettingsClient,
  OverlayStart,
} from '@kbn/core/public';
import { EmbeddableExamplesStart } from '@kbn/embeddable-examples-plugin/public/plugin';
import { HelloWorldEmbeddableExample } from './hello_world_embeddable_example';
import { TodoEmbeddableExample } from './todo_embeddable_example';
import { ListContainerExample } from './list_container_example';
import { EmbeddablePanelExample } from './embeddable_panel_example';

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
