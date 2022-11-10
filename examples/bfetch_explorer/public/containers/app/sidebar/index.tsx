/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPageSideBar_Deprecated as EuiPageSideBar, EuiSideNav } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { routes } from '../../../routes';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SidebarProps {}

export const Sidebar: React.FC<SidebarProps> = () => {
  const history = useHistory();

  return (
    <EuiPageSideBar>
      <EuiSideNav
        items={[
          {
            name: 'bfetch explorer',
            id: 'home',
            items: routes.map(({ id, title, items }) => ({
              id,
              name: title,
              isSelected: true,
              items: items.map((route) => ({
                id: route.id,
                name: route.title,
                onClick: () => history.push(`/${route.id}`),
                'data-test-subj': route.id,
              })),
            })),
          },
        ]}
      />
    </EuiPageSideBar>
  );
};
