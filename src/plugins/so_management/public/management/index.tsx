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

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Switch, Route, useParams, useLocation } from 'react-router-dom';
import { parse } from 'query-string';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup, CoreStart, ChromeBreadcrumb } from 'src/core/public';
import { ManagementSetup } from '../../../management/public';
import { DataPublicPluginStart } from '../../../data/public';
import { StartDependencies } from '../plugin';
import { ISavedObjectsManagementRegistry } from '../management_registry';
import { SavedObjectsTable } from './saved_objects_table';
import { SavedObjectEdition } from './saved_objects_view';
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
              <Route path={'/:service/:id'} exact={true}>
                <SavedObjectsEditionPage
                  coreStart={coreStart}
                  serviceRegistry={serviceRegistry}
                  setBreadcrumbs={setBreadcrumbs}
                />
              </Route>
              <Route path={'/'} exact={false}>
                <SavedObjectsTablePage
                  coreStart={coreStart}
                  dataStart={data}
                  serviceRegistry={serviceRegistry}
                  allowedTypes={allowedTypes}
                  setBreadcrumbs={setBreadcrumbs}
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

const SavedObjectsEditionPage = ({
  coreStart,
  serviceRegistry,
  setBreadcrumbs,
}: {
  coreStart: CoreStart;
  serviceRegistry: ISavedObjectsManagementRegistry;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}) => {
  const { service: serviceName, id } = useParams<{ service: string; id: string }>();
  const capabilities = coreStart.application.capabilities;

  const { search } = useLocation();
  const query = parse(search);

  useEffect(() => {
    setBreadcrumbs([]); // TODO: proper breadcrumb
  }, [setBreadcrumbs]);

  return (
    <SavedObjectEdition
      id={id}
      serviceName={serviceName}
      serviceRegistry={serviceRegistry}
      savedObjectsClient={coreStart.savedObjects.client}
      overlays={coreStart.overlays}
      notifications={coreStart.notifications}
      capabilities={capabilities}
      notFoundType={query.notFound as string}
    />
  );
};

const SavedObjectsTablePage = ({
  coreStart,
  dataStart,
  allowedTypes,
  serviceRegistry,
  setBreadcrumbs,
}: {
  coreStart: CoreStart;
  dataStart: DataPublicPluginStart;
  allowedTypes: string[];
  serviceRegistry: ISavedObjectsManagementRegistry;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}) => {
  const capabilities = coreStart.application.capabilities;
  const itemsPerPage = coreStart.uiSettings.get<number>('savedObjects:perPage', 50);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('kbn.management.savedObjects.indexBreadcrumb', {
          defaultMessage: 'Saved objects',
        }),
        href: '#/management/kibana/objects',
      },
    ]);
  }, [setBreadcrumbs]);

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
          // TODO: it seems only editable objects are done from without the management page.
          // previously, kbnUrl.change(object.meta.editUrl); was used.
          // using direct access to location.hash seems the only option for now.

          // TODO: remove redirect hack
          window.location.hash = editUrl.replace('/objects', '/toto');
        }
      }}
      canGoInApp={savedObject => {
        const { inAppUrl } = savedObject.meta;
        return inAppUrl ? get(capabilities, inAppUrl.uiCapabilitiesPath) : false;
      }}
    />
  );
};
