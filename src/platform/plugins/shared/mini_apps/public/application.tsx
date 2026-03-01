/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { EuiPageTemplate } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { StartDeps } from './types';
import { MiniAppsProvider } from './context';
import { MiniAppsList, MiniAppEditor, MiniAppRunner } from './components';

interface MiniAppsAppProps {
  coreStart: CoreStart;
  depsStart: StartDeps;
  history: AppMountParameters['history'];
}

const MiniAppsApp: React.FC<MiniAppsAppProps> = ({ coreStart, depsStart, history }) => {
  return (
    <KibanaRenderContextProvider {...coreStart}>
      <I18nProvider>
        <MiniAppsProvider coreStart={coreStart} depsStart={depsStart} history={history}>
          <Router history={history}>
            <EuiPageTemplate panelled restrictWidth={false} grow>
              <Routes>
                <Route path="/create" exact>
                  <MiniAppEditor />
                </Route>
                <Route path="/edit/:id" exact>
                  <MiniAppEditor />
                </Route>
                <Route path="/run/:id" exact>
                  <MiniAppRunner />
                </Route>
                <Route path="/">
                  <MiniAppsList />
                </Route>
              </Routes>
            </EuiPageTemplate>
          </Router>
        </MiniAppsProvider>
      </I18nProvider>
    </KibanaRenderContextProvider>
  );
};

export const renderApp = (
  coreStart: CoreStart,
  depsStart: StartDeps,
  { element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <MiniAppsApp coreStart={coreStart} depsStart={depsStart} history={history} />,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
