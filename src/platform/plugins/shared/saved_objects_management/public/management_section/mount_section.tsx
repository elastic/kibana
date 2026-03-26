/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { SavedObjectManagementTypeInfo } from '../../common/types';
import type { StartDependencies, SavedObjectsManagementPluginStart } from '../plugin';
import { getAllowedTypes } from '../lib';
import type {
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementColumnServiceStart,
} from '../services';

interface MountParams {
  core: CoreSetup<StartDependencies, SavedObjectsManagementPluginStart>;
  mountParams: ManagementAppMountParams;
  getActionServiceStart: () => SavedObjectsManagementActionServiceStart;
  getColumnServiceStart: () => SavedObjectsManagementColumnServiceStart;
}

let allowedObjectTypes: SavedObjectManagementTypeInfo[] | undefined;

const title = i18n.translate('savedObjectsManagement.objects.savedObjectsTitle', {
  defaultMessage: 'Saved Objects',
});

const SavedObjectsEditionPage = lazy(() => import('./saved_objects_edition_page'));
const SavedObjectsTablePage = lazy(() => import('./saved_objects_table_page'));
export const mountManagementSection = async ({
  core,
  mountParams,
  getColumnServiceStart,
  getActionServiceStart,
}: MountParams) => {
  const [coreStart, { data, dataViews, savedObjectsTaggingOss, spaces: spacesApi }] =
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

  const { Provider: KibanaReactContextProvider } = createKibanaReactContext(coreStart);

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaReactContextProvider>
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
                    actionRegistry={getActionServiceStart()}
                    columnRegistry={getColumnServiceStart()}
                    allowedTypes={allowedObjectTypes}
                    setBreadcrumbs={setBreadcrumbs}
                  />
                </Suspense>
              </RedirectToHomeIfUnauthorized>
            </Route>
          </Routes>
        </Router>
      </KibanaReactContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};
