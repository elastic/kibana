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

import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Switch, Route } from 'react-router-dom';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup, CoreStart } from 'src/core/public';
import { ManagementSetup } from '../../../management/public';
import { DataPublicPluginStart } from '../../../data/public';
import { StartDependencies } from '../plugin';
import { ISavedObjectsManagementRegistry } from '../management_registry';
import { SavedObjectsTable } from './saved_objects_table';
import { getAllowedTypes } from './lib';

interface RegisterOptions {
  core: CoreSetup<StartDependencies>;
  sections: ManagementSetup['sections'];
  serviceRegistry: ISavedObjectsManagementRegistry;
}

const title = i18n.translate('kbn.management.objects.savedObjectsSectionLabel', {
  defaultMessage: 'Saved Objects XXX',
});

export const registerManagementSection = ({ core, sections, serviceRegistry }: RegisterOptions) => {
  const kibanaSection = sections.getSection('kibana');
  if (!kibanaSection) {
    throw new Error('`kibana` management section not found.');
  }
  kibanaSection.registerApp({
    id: 'toto', // 'objects',
    title,
    order: 10,
    mount: async ({ element, basePath, setBreadcrumbs }) => {
      const [coreStart, { data }] = await core.getStartServices();
      const allowedTypes = await getAllowedTypes(coreStart.http);

      ReactDOM.render(
        <I18nProvider>
          <HashRouter basename={basePath}>
            <Switch>
              <Route path={['/']}>
                <SavedObjectsTablePage
                  coreStart={coreStart}
                  dataStart={data}
                  serviceRegistry={serviceRegistry}
                  allowedTypes={allowedTypes}
                />
              </Route>
            </Switch>
          </HashRouter>
        </I18nProvider>,
        element
      );

      return () => {
        ReactDOM.unmountComponentAtNode(element);
      };
    },
  });
};

const SavedObjectsTablePage = ({
  coreStart,
  dataStart,
  allowedTypes,
  serviceRegistry,
}: {
  coreStart: CoreStart;
  dataStart: DataPublicPluginStart;
  allowedTypes: string[];
  serviceRegistry: ISavedObjectsManagementRegistry;
}) => {
  const capabilities = coreStart.application.capabilities;
  const itemsPerPage = coreStart.uiSettings.get<number>('savedObjects:perPage', 50);
  return (
    <SavedObjectsTable
      allowedTypes={allowedTypes}
      serviceRegistry={serviceRegistry}
      savedObjectsClient={coreStart.savedObjects.client}
      indexPatterns={dataStart.indexPatterns}
      http={coreStart.http}
      overlays={coreStart.overlays}
      notifications={coreStart.notifications}
      capabilities={coreStart.application.capabilities}
      perPageConfig={itemsPerPage}
      goInspectObject={savedObject => {
        const { editUrl } = savedObject.meta;
        if (editUrl) {
          // TODO: fix, this doesnt work. find solution to change hashbang
          // kbnUrl.change(object.meta.editUrl);
          window.location.href = editUrl;
        }
      }}
      canGoInApp={savedObject => {
        const { inAppUrl } = savedObject.meta;
        return inAppUrl ? get(capabilities, inAppUrl.uiCapabilitiesPath) : false;
      }}
    />
  );
};
