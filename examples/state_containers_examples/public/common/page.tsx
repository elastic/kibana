/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { PropsWithChildren } from 'react';
import { EuiPage, EuiPageSideBar, EuiSideNav } from '@elastic/eui';
import { CoreStart } from '../../../../src/core/public';

interface PageDef {
  title: string;
  id: string;
}

interface NavProps {
  navigateToApp: CoreStart['application']['navigateToApp'];
  pages: PageDef[];
}

const SideNav: React.FC<NavProps> = ({ navigateToApp, pages }: NavProps) => {
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
};

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
        <SideNav
          navigateToApp={navigateToApp}
          pages={[
            {
              title: 'Example 1',
              id: 'example1',
            },
            {
              title: 'Example 2',
              id: 'example2',
            },
          ]}
        />
      </EuiPageSideBar>
      {children}
    </EuiPage>
  );
};
