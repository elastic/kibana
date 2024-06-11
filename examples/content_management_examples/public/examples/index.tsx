/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Redirect } from 'react-router-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { EuiPageTemplate, EuiSideNav } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { StartDeps } from '../types';
import { TodoApp } from './todos';
import { MSearchApp } from './msearch';
import { FinderApp } from './finder';

export const renderApp = (
  core: CoreStart,
  { contentManagement, savedObjectsTaggingOss }: StartDeps,
  { element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <Router history={history}>
        <RedirectAppLinks coreStart={core}>
          <EuiPageTemplate offset={0}>
            <EuiPageTemplate.Sidebar>
              <EuiSideNav
                items={[
                  {
                    id: 'Examples',
                    name: 'Examples',
                    items: [
                      {
                        id: 'todos',
                        name: 'Todo app',
                        'data-test-subj': 'todosExample',
                        href: '/app/contentManagementExamples/todos',
                      },
                      {
                        id: 'msearch',
                        name: 'MSearch',
                        'data-test-subj': 'msearchExample',
                        href: '/app/contentManagementExamples/msearch',
                      },
                      {
                        id: 'finder',
                        name: 'Finder',
                        'data-test-subj': 'finderExample',
                        href: '/app/contentManagementExamples/finder',
                      },
                    ],
                  },
                ]}
              />
            </EuiPageTemplate.Sidebar>

            <EuiPageTemplate.Section>
              <Routes>
                <Redirect from="/" to="/todos" exact />
                <Route path="/todos">
                  <TodoApp contentClient={contentManagement.client} />
                </Route>
                <Route path="/msearch">
                  <MSearchApp
                    contentClient={contentManagement.client}
                    core={core}
                    savedObjectsTagging={savedObjectsTaggingOss}
                  />
                </Route>
                <Route path="/finder">
                  <FinderApp
                    contentClient={contentManagement.client}
                    core={core}
                    savedObjectsTagging={savedObjectsTaggingOss}
                  />
                </Route>
              </Routes>
            </EuiPageTemplate.Section>
          </EuiPageTemplate>
        </RedirectAppLinks>
      </Router>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
