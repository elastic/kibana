/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { EuiPage, EuiPageSideBar_Deprecated as EuiPageSideBar, EuiSideNav } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';

export interface ExampleLink {
  title: string;
  appId: string;
}

interface NavProps {
  navigateToApp: CoreStart['application']['navigateToApp'];
  exampleLinks: ExampleLink[];
}

const SideNav: React.FC<NavProps> = ({ navigateToApp, exampleLinks }: NavProps) => {
  const navItems = exampleLinks.map((example) => ({
    id: example.appId,
    name: example.title,
    onClick: () => navigateToApp(example.appId),
    'data-test-subj': example.appId,
  }));

  return (
    <EuiSideNav
      items={[
        {
          name: 'State management examples',
          id: 'home',
          items: [...navItems],
        },
      ]}
    />
  );
};

interface Props {
  navigateToApp: CoreStart['application']['navigateToApp'];
  exampleLinks: ExampleLink[];
}

export const StateContainersExamplesPage: FC<PropsWithChildren<Props>> = ({
  navigateToApp,
  children,
  exampleLinks,
} ) => {
  return (
    <EuiPage>
      <EuiPageSideBar>
        <SideNav navigateToApp={navigateToApp} exampleLinks={exampleLinks} />
      </EuiPageSideBar>
      {children}
    </EuiPage>
  );
};
