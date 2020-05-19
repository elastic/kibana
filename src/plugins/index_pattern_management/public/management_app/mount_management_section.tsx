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
import { Router, Switch, Route } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { StartServicesAccessor } from 'src/core/public';

import { ManagementAppMountParams } from '../../../management/public';
import {
  IndexPatternTableWithRouter,
  EditIndexPatternContainer,
  CreateEditFieldContainer,
  CreateIndexPatternWizardWithRouter,
} from '../components';
import { IndexPatternManagementStartDependencies, IndexPatternManagementStart } from '../plugin';

const readOnlyBadge = {
  text: i18n.translate('indexPatternManagement.indexPatterns.badge.readOnly.text', {
    defaultMessage: 'Read only',
  }),
  tooltip: i18n.translate('indexPatternManagement.indexPatterns.badge.readOnly.tooltip', {
    defaultMessage: 'Unable to save index patterns',
  }),
  iconType: 'glasses',
};

export async function mountManagementSection(
  getStartServices: StartServicesAccessor<IndexPatternManagementStartDependencies>,
  params: ManagementAppMountParams
) {
  const [
    { chrome, application, savedObjects, uiSettings, notifications, overlays, http, docLinks },
    { data },
    indexPatternManagementStart,
  ] = await getStartServices();
  const canSave = Boolean(application.capabilities.indexPatterns.save);

  if (!canSave) {
    chrome.setBadge(readOnlyBadge);
  }

  ReactDOM.render(
    <I18nProvider>
      <Router history={params.history}>
        <Switch>
          <Route path={['/create']}>
            <CreateIndexPatternWizardWithRouter
              services={{
                indexPatternCreation: (indexPatternManagementStart as IndexPatternManagementStart)
                  .creation,
                es: data.search.__LEGACY.esClient,
                indexPatterns: data.indexPatterns,
                savedObjectsClient: savedObjects.client,
                uiSettings,
                docTitle: chrome.docTitle,
                openConfirm: overlays.openConfirm,
                setBreadcrumbs: params.setBreadcrumbs,
                prependBasePath: http.basePath.prepend,
              }}
            />
          </Route>
          <Route path={['/patterns/:id/field/:fieldName', '/patterns/:id/create-field/']}>
            <CreateEditFieldContainer
              getIndexPattern={data.indexPatterns.get}
              fieldFormatEditors={
                (indexPatternManagementStart as IndexPatternManagementStart).fieldFormatEditors
              }
              getConfig={uiSettings}
              services={{
                http,
                notifications,
                uiSettings,
                docTitle: chrome.docTitle,
                docLinksScriptedFields: docLinks.links.scriptedFields,
                toasts: notifications.toasts,
                fieldFormats: data.fieldFormats,
                SearchBar: data.ui.SearchBar,
                indexPatterns: data.indexPatterns,
                setBreadcrumbs: params.setBreadcrumbs,
              }}
            />
          </Route>
          <Route path={['/patterns/:id']}>
            <EditIndexPatternContainer
              getIndexPattern={data.indexPatterns.get}
              config={uiSettings}
              services={{
                notifications,
                docTitle: chrome.docTitle,
                overlays,
                savedObjectsClient: savedObjects.client,
                setBreadcrumbs: params.setBreadcrumbs,
                indexPatternManagement: indexPatternManagementStart as IndexPatternManagementStart,
                painlessDocLink: docLinks.links.scriptedFields.painless,
              }}
            />
          </Route>
          <Route path={['/']}>
            <IndexPatternTableWithRouter
              getIndexPatternCreationOptions={
                (indexPatternManagementStart as IndexPatternManagementStart).creation
                  .getIndexPatternCreationOptions
              }
              canSave={canSave}
              services={{
                savedObjectsClient: savedObjects.client,
                uiSettings,
                docTitle: chrome.docTitle,
                setBreadcrumbs: params.setBreadcrumbs,
                indexPatternManagement: indexPatternManagementStart as IndexPatternManagementStart,
              }}
            />
          </Route>
        </Switch>
      </Router>
    </I18nProvider>,
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
}
