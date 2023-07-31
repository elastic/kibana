/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPageSidebar, EuiSideNav } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { routes } from '../../routes';

export const Sidebar: React.FC = () => {
  const history = useHistory();

  return (
    <EuiPageSidebar>
      <EuiSideNav
        items={routes.map(({ id, title, items }) => ({
          id,
          name: title,
          isSelected: true,
          items: items.map((route) => ({
            id: route.id,
            name: route.title,
            onClick: () => history.push(`/${route.id}`),
            'data-test-subj': route.id,
          })),
        }))}
      />
    </EuiPageSidebar>
  );
};
