/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { PropsWithChildren } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, withRouter, RouteComponentProps } from 'react-router-dom';

import { EuiPage, EuiPageSideBar, EuiSideNav } from '@elastic/eui';

import { EmbeddableStart } from '../../../src/plugins/embeddable/public';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { Start as InspectorStartContract } from '../../../src/plugins/inspector/public';
import {
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
  navigateToApp: CoreStart['application']['navigateToApp'];
  pages: PageDef[];
};

const Page = withRouter(({ history, navigateToApp, pages }: NavProps) => {
  const navItems = pages.map((page) => ({
    id: page.id,
    name: page.title,
    onClick: () => navigateToApp(page.id),
    'data-test-subj': page.id,
  }));

  return (
    <EuiSideNav
      items={[
        {
          name: 'State containers & state sync examples',
          id: 'home',
          items: [...navItems],
        },
      ]}
    />
  );
});

interface Props {
  navigateToApp: CoreStart['application']['navigateToApp'];
}

export const StateContainersExamplesPage: React.FC<Props> = ({
  navigateToApp,
  children,
}: PropsWithChildren<Props>) => {
  return (
    <EuiPage>
      <EuiPageSideBar>
        <Page navigateToApp={navigateToApp} pages={pages} />
      </EuiPageSideBar>
      {children}
    </EuiPage>
  );
};
