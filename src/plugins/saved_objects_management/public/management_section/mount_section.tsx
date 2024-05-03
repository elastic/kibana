/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense, FC, PropsWithChildren } from 'react';
import ReactDOM from 'react-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner } from '@elastic/eui';
import { CoreSetup } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { SavedObjectManagementTypeInfo } from '../../common/types';
import { StartDependencies, SavedObjectsManagementPluginStart } from '../plugin';
import { getAllowedTypes } from '../lib';

interface MountParams {
  core: CoreSetup<StartDependencies, SavedObjectsManagementPluginStart>;
  mountParams: ManagementAppMountParams;
}

let allowedObjectTypes: SavedObjectManagementTypeInfo[] | undefined;

const title = i18n.translate('savedObjectsManagement.objects.savedObjectsTitle', {
  defaultMessage: 'Saved Objects',
});

const SavedObjectsEditionPage = lazy(() => import('./saved_objects_edition_page'));
const SavedObjectsTablePage = lazy(() => import('./saved_objects_table_page'));
export const mountManagementSection = async ({ core, mountParams }: MountParams) => {
  const [coreStart, { data, dataViews, savedObjectsTaggingOss, spaces: spacesApi }, pluginStart] =
    await core.getStartServices();
  const { capabilities } = coreStart.application;
  const { element, history, setBreadcrumbs } = mountParams;

  if (!allowedObjectTypes) {
    allowedObjectTypes = await getAllowedTypes(coreStart.http);
  }

  coreStart.chrome.docTitle.change(title);

  const RedirectToHomeIfUnauthorized: FC<PropsWithChildren<unknown>> = ({ children }) => {
    const allowed = capabilities?.management?.kibana?.objects ?? false;

    if (!allowed) {
      coreStart.application.navigateToApp('home');
      return null;
    }
    return children! as React.ReactElement;
  };

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <Router history={history}>
        <Routes>
          <Route path={'/:type/:id'} exact={true}>
            <RedirectToHomeIfUnauthorized>
              <Suspense fallback={<EuiLoadingSpinner />}>
                <SavedObjectsEditionPage
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
                <SavedObjectsTablePage
                  coreStart={coreStart}
                  taggingApi={savedObjectsTaggingOss?.getTaggingApi()}
                  spacesApi={spacesApi}
                  dataStart={data}
                  dataViewsApi={dataViews}
                  actionRegistry={pluginStart.actions}
                  columnRegistry={pluginStart.columns}
                  allowedTypes={allowedObjectTypes}
                  setBreadcrumbs={setBreadcrumbs}
                />
              </Suspense>
            </RedirectToHomeIfUnauthorized>
          </Route>
        </Routes>
      </Router>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};
