/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { BrowserRouter as Router, Routes, Route } from '@kbn/shared-ux-router';
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';
import { Overview } from './overview';
import { RegisterEmbeddable } from './register_embeddable';
import { RenderExamples } from './render_examples';
import { PresentationContainerExample } from './presentation_container_example/components/presentation_container_example';
import { StartDeps } from '../plugin';
import { Sidebar } from './sidebar';
import { StateManagementExample } from './state_management_example/components/state_management_example';

const App = ({
  core,
  deps,
  mountParams,
}: {
  core: CoreStart;
  deps: StartDeps;
  mountParams: AppMountParameters;
}) => {
  const pages = useMemo(() => {
    return [
      {
        id: 'overview',
        title: 'Embeddables overview',
        component: <Overview />,
      },
      {
        id: 'registerEmbeddable',
        title: 'Register a new embeddable type',
        component: <RegisterEmbeddable />,
      },
      {
        id: 'renderEmbeddable',
        title: 'Render embeddables in your application',
        component: <RenderExamples />,
      },
      {
        id: 'stateManagement',
        title: 'Embeddable state management',
        component: <StateManagementExample uiActions={deps.uiActions} />
      },
      {
        id: 'presentationContainer',
        title: 'Create a dashboard like experience with embeddables',
        component: <PresentationContainerExample uiActions={deps.uiActions} />,
      },
    ];
  }, [deps.uiActions]);

  const routes = useMemo(() => {
    return pages.map((page) => (
      <Route
        key={page.id}
        path={`/${page.id}`}
        render={(props) => (
          <>
            <EuiPageTemplate.Header>
              <EuiTitle size="l">
                <h1 data-test-subj="responseStreamPageTitle">{page.title}</h1>
              </EuiTitle>
            </EuiPageTemplate.Header>
            <EuiPageTemplate.Section>{page.component}</EuiPageTemplate.Section>
          </>
        )}
      />
    ));
  }, [pages]);

  return (
    <KibanaRenderContextProvider i18n={core.i18n} theme={core.theme}>
      <Router basename={mountParams.appBasePath}>
        <EuiPageTemplate restrictWidth={true} offset={0}>
          <EuiPageTemplate.Sidebar sticky={true}>
            <Sidebar pages={pages} />
          </EuiPageTemplate.Sidebar>
          <Routes>
            {routes}
            <Redirect to="/overview" />
          </Routes>
        </EuiPageTemplate>
      </Router>
    </KibanaRenderContextProvider>
  );
};

export const renderApp = (core: CoreStart, deps: StartDeps, mountParams: AppMountParameters) => {
  ReactDOM.render(<App core={core} deps={deps} mountParams={mountParams} />, mountParams.element);

  return () => ReactDOM.unmountComponentAtNode(mountParams.element);
};
