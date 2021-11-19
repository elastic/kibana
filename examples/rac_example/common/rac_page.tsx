/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiPage, EuiPageSideBar, EuiSideNav } from '@elastic/eui';
import { IBasePath } from 'kibana/public';
import { RAC_EXAMPLE_APP_ID } from './constants';

interface NavProps {
  basePath: IBasePath;
}

const SideNav: React.FC<NavProps> = ({ basePath }: NavProps) => {
  const sideNav = [
    {
      name: 'Rac Example',
      id: 'home',
      items: [
        {
          name: 'Create a rule',
          id: `/app/${RAC_EXAMPLE_APP_ID}/rules`,
          isSelected: true,
          href: basePath.prepend(`/app/${RAC_EXAMPLE_APP_ID}/rules`),
        },
        {
          name: 'Developer Guide',
          id: `/app/${RAC_EXAMPLE_APP_ID}/developer_guide`,
          href: `/app/${RAC_EXAMPLE_APP_ID}/developer_guide`,
        },
      ],
    },
  ];
  return <EuiSideNav items={sideNav} />;
};
export const RacExamplePage: React.FC<NavProps> = ({ children, basePath }) => {
  return (
    <EuiPage>
      <EuiPageSideBar>
        <SideNav basePath={basePath} />
      </EuiPageSideBar>
      {children}
    </EuiPage>
  );
};
