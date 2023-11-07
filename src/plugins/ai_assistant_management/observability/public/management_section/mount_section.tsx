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
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CoreSetup } from '@kbn/core/public';
import { wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { StartDependencies, AiAssistantManagementObservabilityPluginStart } from '../plugin';
import { aIAssistantManagementObservabilityRouter } from '../routes/config';
import { RedirectToHomeIfUnauthorized } from '../routes/components/redirect_to_home_if_unauthorized';
import { AppContextProvider } from '../app_context';

interface MountParams {
  core: CoreSetup<StartDependencies, AiAssistantManagementObservabilityPluginStart>;
  mountParams: ManagementAppMountParams;
}

export const mountManagementSection = async ({ core, mountParams }: MountParams) => {
  const [coreStart, startDeps] = await core.getStartServices();
  const { element, history, setBreadcrumbs } = mountParams;
  const { theme$ } = core.theme;

  coreStart.chrome.docTitle.change(
    i18n.translate('aiAssistantManagementObservability.app.titleBar', {
      defaultMessage: 'AI Assistants for Observability',
    })
  );

  ReactDOM.render(
    wrapWithTheme(
      <RedirectToHomeIfUnauthorized coreStart={coreStart}>
        <I18nProvider>
          <AppContextProvider
            value={{
              ...startDeps,
              setBreadcrumbs,
              navigateToApp: coreStart.application.navigateToApp,
            }}
          >
            <RouterProvider
              history={history}
              router={aIAssistantManagementObservabilityRouter as any}
            >
              <RouteRenderer />
            </RouterProvider>
          </AppContextProvider>
        </I18nProvider>
      </RedirectToHomeIfUnauthorized>,
      theme$
    ),
    element
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};
