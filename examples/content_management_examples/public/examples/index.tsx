/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPageTemplate, EuiSideNav } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import ReactDOM from 'react-dom';
import { Redirect } from 'react-router-dom';
import { StartDeps } from '../types';
import { FinderApp } from './finder';
import { MSearchApp } from './msearch';
import { TodoApp } from './todos';

export const renderApp = (
  core: CoreStart,
  { contentManagement, savedObjectsTaggingOss }: StartDeps,
  { element, history }: AppMountParameters
) => {
  ReactDOM.render(
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
    </Router>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
