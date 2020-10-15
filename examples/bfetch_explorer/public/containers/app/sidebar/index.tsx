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
import { EuiPageSideBar, EuiSideNav } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { routes } from '../../../routes';

// eslint-disable-next-line
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
