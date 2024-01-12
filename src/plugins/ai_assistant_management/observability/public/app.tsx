/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { CoreSetup } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { StartDependencies, AiAssistantManagementObservabilityPluginStart } from './plugin';
import { aIAssistantManagementObservabilityRouter } from './routes/config';
import { RedirectToHomeIfUnauthorized } from './routes/components/redirect_to_home_if_unauthorized';
import { AppContextProvider } from './context/app_context';

interface MountParams {
  core: CoreSetup<StartDependencies, AiAssistantManagementObservabilityPluginStart>;
  mountParams: ManagementAppMountParams;
}

export const mountManagementSection = async ({ core, mountParams }: MountParams) => {
  const [coreStart, startDeps] = await core.getStartServices();

  if (!startDeps.observabilityAIAssistant) return () => {};

  const { element, history, setBreadcrumbs } = mountParams;

  coreStart.chrome.docTitle.change(
    i18n.translate('aiAssistantManagementObservability.app.titleBar', {
      defaultMessage: 'AI Assistant for Observability Settings',
    })
  );

  const queryClient = new QueryClient();

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <RedirectToHomeIfUnauthorized coreStart={coreStart}>
        <AppContextProvider
          value={{
            application: coreStart.application,
            http: coreStart.http,
            notifications: coreStart.notifications,
            observabilityAIAssistant: startDeps.observabilityAIAssistant,
            uiSettings: coreStart.uiSettings,
            serverless: startDeps.serverless,
            setBreadcrumbs,
          }}
        >
          <QueryClientProvider client={queryClient}>
            <RouterProvider
              history={history}
              router={aIAssistantManagementObservabilityRouter as any}
            >
              <RouteRenderer />
            </RouterProvider>
          </QueryClientProvider>
        </AppContextProvider>
      </RedirectToHomeIfUnauthorized>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};
