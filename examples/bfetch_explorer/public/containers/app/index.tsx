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

import React, { useMemo } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { EuiPage } from '@elastic/eui';
import { useDeps } from '../../hooks/use_deps';
import { Sidebar } from './sidebar';
import { routes } from '../../routes';

export const App: React.FC = () => {
  const { appBasePath, plugins } = useDeps();
  const double = useMemo(
    () =>
      plugins.bfetch.batchedFunction<{ num: number }, { num: number; delay: number }>({
        url: '/bfetch_explorer/double',
      }),
    [plugins.bfetch]
  );

  return (
    <Router basename={appBasePath}>
      <EuiPage>
        <Sidebar />
        {routes.map(({ id, component }) => (
          <Route key={id} path={`/${id}`} render={props => component} />
        ))}
      </EuiPage>
    </Router>
  );
};
