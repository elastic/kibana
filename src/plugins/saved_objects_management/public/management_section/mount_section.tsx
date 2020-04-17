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
import { CoreSetup, CoreStart, ChromeBreadcrumb, Capabilities } from 'src/core/public';
import { ManagementAppMountParams } from '../../../management/public';
import { DataPublicPluginStart } from '../../../data/public';
import { StartDependencies, SavedObjectsManagementPluginStart } from '../plugin';
import {
  ISavedObjectsManagementServiceRegistry,
  SavedObjectsManagementActionServiceStart,
} from '../services';
import { SavedObjectsTable } from './objects_table';
import { SavedObjectEdition } from './object_view';
import { getAllowedTypes } from './../lib';

interface MountParams {
  core: CoreSetup<StartDependencies, SavedObjectsManagementPluginStart>;
  serviceRegistry: ISavedObjectsManagementServiceRegistry;
  mountParams: ManagementAppMountParams;
}

let allowedObjectTypes: string[] | undefined;

export const mountManagementSection = async ({
  core,
  mountParams,
  serviceRegistry,
}: MountParams) => {
  const [coreStart, { data }, pluginStart] = await core.getStartServices();
  const { element, basePath, setBreadcrumbs } = mountParams;
  if (allowedObjectTypes === undefined) {
    allowedObjectTypes = await getAllowedTypes(coreStart.http);
  }

  const capabilities = coreStart.application.capabilities;

  ReactDOM.render(
    <I18nProvider>
      <HashRouter basename={basePath}>
        <Switch>
          <Route path={'/:service/:id'} exact={true}>
            <RedirectToHomeIfUnauthorized capabilities={capabilities}>
              <SavedObjectsEditionPage
                coreStart={coreStart}
                serviceRegistry={serviceRegistry}
                setBreadcrumbs={setBreadcrumbs}
              />
            </RedirectToHomeIfUnauthorized>
          </Route>
          <Route path={'/'} exact={false}>
            <RedirectToHomeIfUnauthorized capabilities={capabilities}>
              <SavedObjectsTablePage
                coreStart={coreStart}
                dataStart={data}
                serviceRegistry={serviceRegistry}
                actionRegistry={pluginStart.actions}
                allowedTypes={allowedObjectTypes}
                setBreadcrumbs={setBreadcrumbs}
              />
            </RedirectToHomeIfUnauthorized>
          </Route>
        </Switch>
      </HashRouter>
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

const RedirectToHomeIfUnauthorized: React.FunctionComponent<{
  capabilities: Capabilities;
}> = ({ children, capabilities }) => {
  const allowed = capabilities?.management?.kibana?.objects ?? false;
  if (!allowed) {
    window.location.hash = '/home';
    return null;
  }
  return children! as React.ReactElement;
};

const SavedObjectsEditionPage = ({
  coreStart,
  serviceRegistry,
  setBreadcrumbs,
}: {
  coreStart: CoreStart;
  serviceRegistry: ISavedObjectsManagementServiceRegistry;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}) => {
  const { service: serviceName, id } = useParams<{ service: string; id: string }>();
  const capabilities = coreStart.application.capabilities;

  const { search } = useLocation();
  const query = parse(search);
  const service = serviceRegistry.get(serviceName);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('savedObjectsManagement.breadcrumb.index', {
          defaultMessage: 'Saved objects',
        }),
        href: '#/management/kibana/objects',
      },
      {
        text: i18n.translate('savedObjectsManagement.breadcrumb.edit', {
          defaultMessage: 'Edit {savedObjectType}',
          values: { savedObjectType: service?.service.type ?? 'object' },
        }),
      },
    ]);
  }, [setBreadcrumbs, service]);

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
  actionRegistry,
  setBreadcrumbs,
}: {
  coreStart: CoreStart;
  dataStart: DataPublicPluginStart;
  allowedTypes: string[];
  serviceRegistry: ISavedObjectsManagementServiceRegistry;
  actionRegistry: SavedObjectsManagementActionServiceStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}) => {
  const capabilities = coreStart.application.capabilities;
  const itemsPerPage = coreStart.uiSettings.get<number>('savedObjects:perPage', 50);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('savedObjectsManagement.breadcrumb.index', {
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
      actionRegistry={actionRegistry}
      savedObjectsClient={coreStart.savedObjects.client}
      indexPatterns={dataStart.indexPatterns}
      search={dataStart.search}
      http={coreStart.http}
      overlays={coreStart.overlays}
      notifications={coreStart.notifications}
      applications={coreStart.application}
      uiSettings={coreStart.uiSettings}
      injectedMetadata={coreStart.injectedMetadata}
      perPageConfig={itemsPerPage}
      goInspectObject={savedObject => {
        const { editUrl } = savedObject.meta;
        if (editUrl) {
          // previously, kbnUrl.change(object.meta.editUrl); was used.
          // using direct access to location.hash seems the only option for now,
          // as using react-router-dom will prefix the url with the router's basename
          // which should be ignored there.
          window.location.hash = editUrl;
        }
      }}
      canGoInApp={savedObject => {
        const { inAppUrl } = savedObject.meta;
        return inAppUrl ? get(capabilities, inAppUrl.uiCapabilitiesPath) : false;
      }}
    />
  );
};
