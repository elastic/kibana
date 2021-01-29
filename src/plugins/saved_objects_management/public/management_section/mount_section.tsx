/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch, Route } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner } from '@elastic/eui';
import { CoreSetup } from 'src/core/public';
import { ManagementAppMountParams } from '../../../management/public';
import { StartDependencies, SavedObjectsManagementPluginStart } from '../plugin';
import { ISavedObjectsManagementServiceRegistry } from '../services';
import { getAllowedTypes } from './../lib';

interface MountParams {
  core: CoreSetup<StartDependencies, SavedObjectsManagementPluginStart>;
  serviceRegistry: ISavedObjectsManagementServiceRegistry;
  mountParams: ManagementAppMountParams;
}

let allowedObjectTypes: string[] | undefined;

const title = i18n.translate('savedObjectsManagement.objects.savedObjectsTitle', {
  defaultMessage: 'Saved Objects',
});

const SavedObjectsEditionPage = lazy(() => import('./saved_objects_edition_page'));
const SavedObjectsTablePage = lazy(() => import('./saved_objects_table_page'));
export const mountManagementSection = async ({
  core,
  mountParams,
  serviceRegistry,
}: MountParams) => {
  const [coreStart, { data, savedObjectsTaggingOss }, pluginStart] = await core.getStartServices();
  const { element, history, setBreadcrumbs } = mountParams;
  if (allowedObjectTypes === undefined) {
    allowedObjectTypes = await getAllowedTypes(coreStart.http);
  }

  coreStart.chrome.docTitle.change(title);

  const capabilities = coreStart.application.capabilities;

  const RedirectToHomeIfUnauthorized: React.FunctionComponent = ({ children }) => {
    const allowed = capabilities?.management?.kibana?.objects ?? false;

    if (!allowed) {
      coreStart.application.navigateToApp('home');
      return null;
    }
    return children! as React.ReactElement;
  };

  ReactDOM.render(
    <I18nProvider>
      <Router history={history}>
        <Switch>
          <Route path={'/:service/:id'} exact={true}>
            <RedirectToHomeIfUnauthorized>
              <Suspense fallback={<EuiLoadingSpinner />}>
                <SavedObjectsEditionPage
                  coreStart={coreStart}
                  serviceRegistry={serviceRegistry}
                  setBreadcrumbs={setBreadcrumbs}
                  history={history}
                />
              </Suspense>
            </RedirectToHomeIfUnauthorized>
          </Route>
          <Route path={'/'} exact={false}>
            <RedirectToHomeIfUnauthorized>
              <Suspense fallback={<EuiLoadingSpinner />}>
                <SavedObjectsTablePage
                  coreStart={coreStart}
                  taggingApi={savedObjectsTaggingOss?.getTaggingApi()}
                  dataStart={data}
                  serviceRegistry={serviceRegistry}
                  actionRegistry={pluginStart.actions}
                  columnRegistry={pluginStart.columns}
                  allowedTypes={allowedObjectTypes}
                  setBreadcrumbs={setBreadcrumbs}
                />
              </Suspense>
            </RedirectToHomeIfUnauthorized>
          </Route>
        </Switch>
      </Router>
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
