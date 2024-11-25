/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PropsWithChildren } from 'react';
import { EuiPage, EuiPageTemplate, EuiSideNav } from '@elastic/eui';
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

export const StateContainersExamplesPage: React.FC<PropsWithChildren<Props>> = ({
  navigateToApp,
  children,
  exampleLinks,
}) => {
  return (
    <EuiPage>
      <EuiPageTemplate.Sidebar>
        <SideNav navigateToApp={navigateToApp} exampleLinks={exampleLinks} />
      </EuiPageTemplate.Sidebar>
      {children}
    </EuiPage>
  );
};
