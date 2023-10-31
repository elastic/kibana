/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner } from '@elastic/eui';
import { CoreSetup } from '@kbn/core/public';
import { wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { StartDependencies, AiAssistantManagementPluginStart } from '../plugin';

interface MountParams {
  core: CoreSetup<StartDependencies, AiAssistantManagementPluginStart>;
  mountParams: ManagementAppMountParams;
}

const AiAssistantSettingsPage = lazy(() => import('./ai_assistant_settings_page'));
const AiAssistantSelectionPage = lazy(() => import('./ai_assistant_selection_page'));

export const mountManagementSection = async ({ core, mountParams }: MountParams) => {
  const [coreStart, { data }, pluginStart] = await core.getStartServices();
  const { capabilities } = coreStart.application;
  const { element, history, setBreadcrumbs } = mountParams;
  const { theme$ } = core.theme;

  coreStart.chrome.docTitle.change(
    i18n.translate('aiAssistantManagement.app.titleBar', {
      defaultMessage: 'AI Assistants',
    })
  );

  const RedirectToHomeIfUnauthorized: React.FunctionComponent = ({ children }) => {
    const allowed = capabilities?.management?.kibana?.objects ?? false;

    if (!allowed) {
      coreStart.application.navigateToApp('home');
      return null;
    }
    return children! as React.ReactElement;
  };

  ReactDOM.render(
    wrapWithTheme(
      <I18nProvider>
        <Router history={history}>
          <Routes>
            <Route path={'/:type'} exact={true}>
              <RedirectToHomeIfUnauthorized>
                <Suspense fallback={<EuiLoadingSpinner />}>
                  <AiAssistantSettingsPage
                    coreStart={coreStart}
                    setBreadcrumbs={setBreadcrumbs}
                    history={history}
                  />
                </Suspense>
              </RedirectToHomeIfUnauthorized>
            </Route>
            <Route path={'/'} exact={false}>
              <RedirectToHomeIfUnauthorized>
                <Suspense fallback={<EuiLoadingSpinner />}>
                  <AiAssistantSelectionPage
                    coreStart={coreStart}
                    dataStart={data}
                    setBreadcrumbs={setBreadcrumbs}
                  />
                </Suspense>
              </RedirectToHomeIfUnauthorized>
            </Route>
          </Routes>
        </Router>
      </I18nProvider>,
      theme$
    ),
    element
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};
