/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch, Route } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n/react';
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

const SavedObjectsEditionPage = lazy(() => import('./saved_objects_edition_page'));
const SavedObjectsTablePage = lazy(() => import('./saved_objects_table_page'));
export const mountManagementSection = async ({
  core,
  mountParams,
  serviceRegistry,
}: MountParams) => {
  const [coreStart, { data }, pluginStart] = await core.getStartServices();
  const { element, history, setBreadcrumbs } = mountParams;
  if (allowedObjectTypes === undefined) {
    allowedObjectTypes = await getAllowedTypes(coreStart.http);
  }

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
                  dataStart={data}
                  serviceRegistry={serviceRegistry}
                  actionRegistry={pluginStart.actions}
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
