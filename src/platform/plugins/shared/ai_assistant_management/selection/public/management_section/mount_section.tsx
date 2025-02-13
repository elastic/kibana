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
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/public';
import { wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { BuildFlavor } from '@kbn/config';
import type { StartDependencies, AIAssistantManagementSelectionPluginPublicStart } from '../plugin';
import { aIAssistantManagementSelectionRouter } from '../routes/config';
import { RedirectToHomeIfUnauthorized } from '../routes/components/redirect_to_home_if_unauthorized';
import { AppContextProvider } from '../app_context';

interface MountParams {
  core: CoreSetup<StartDependencies, AIAssistantManagementSelectionPluginPublicStart>;
  mountParams: ManagementAppMountParams;
  kibanaBranch: string;
  buildFlavor: BuildFlavor;
}

export const mountManagementSection = async ({
  core,
  mountParams,
  kibanaBranch,
  buildFlavor,
}: MountParams) => {
  const [coreStart, startDeps] = await core.getStartServices();
  const { element, history, setBreadcrumbs } = mountParams;
  const { theme$ } = core.theme;

  coreStart.chrome.docTitle.change(
    i18n.translate('aiAssistantManagementSelection.app.titleBar', {
      defaultMessage: 'AI Assistants',
    })
  );

  ReactDOM.render(
    wrapWithTheme(
      <RedirectToHomeIfUnauthorized coreStart={coreStart}>
        <I18nProvider>
          <AppContextProvider
            value={{
              ...startDeps,
              capabilities: coreStart.application.capabilities,
              navigateToApp: coreStart.application.navigateToApp,
              setBreadcrumbs,
              kibanaBranch,
              buildFlavor,
            }}
          >
            <RouterProvider history={history} router={aIAssistantManagementSelectionRouter as any}>
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
