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

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { StartServicesAccessor } from 'src/core/public';
import { IIndexPattern } from 'src/plugins/data/public';

import { ManagementAppMountParams } from '../../../management/public';
import {
  IndexPatternTableWithRouter,
  EditIndexPatternContainer,
  CreateEditFieldContainer,
  CreateIndexPatternWizardWithRouter,
} from '../components';
import { IndexPatternManagementStartDependencies, IndexPatternManagementStart } from '../plugin';

const appTitle = i18n.translate('indexPatternManagement.indexPattern.sectionsHeader', {
  defaultMessage: 'Index Patterns',
});
const crumb = [{ text: appTitle }];

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
  params.setBreadcrumbs(crumb);
  const [
    { chrome, application, savedObjects, uiSettings, notifications, overlays, http, docLinks },
    { data },
    indexPatternManagementStart,
  ] = await getStartServices();
  const defaultIndex = uiSettings.get('defaultIndex');
  const canSave = application.capabilities.indexPatterns.save as boolean;

  if (!canSave) {
    chrome.setBadge(readOnlyBadge);
  }

  const indexPatterns =
    (await savedObjects.client
      .find<IIndexPattern>({
        type: 'index-pattern',
        fields: ['title', 'type'],
        perPage: 10000,
      })
      .then(response =>
        response.savedObjects
          .map(pattern => {
            const id = pattern.id;
            const title = pattern.get('title');
            const isDefault = defaultIndex === id;

            const tags = (indexPatternManagementStart as IndexPatternManagementStart).list.getIndexPatternTags(
              pattern,
              isDefault
            );

            return {
              id,
              title,
              url: '',
              // url: kbnUrl.eval('#/management/kibana/indexPatterns/create{{id}}', { id }),
              // active: $scope.editingId === id,
              default: isDefault,
              tags,
              // the prepending of 0 at the default pattern takes care of prioritization
              // so the sorting will but the default index on top
              // or on bottom of a the table
              sort: `${isDefault ? '0' : '1'}${title}`,
            };
          })
          .sort((a, b) => {
            if (a.sort < b.sort) {
              return -1;
            } else if (a.sort > b.sort) {
              return 1;
            } else {
              return 0;
            }
          })
      )) || [];

  // todo - need new path to create index pattern
  // todo navigate to items
  // todo path w/o slash
  //
  // indexPattern, indexPatterns

  // data.indexPatterns.get()

  ReactDOM.render(
    <I18nProvider>
      <HashRouter basename={params.basePath}>
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
                openConfirm: overlays.openConfirm,
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
                docTitle: chrome.docTitle,
                docLinksScriptedFields: docLinks.links.scriptedFields,
                UiSettings: uiSettings,
                toasts: notifications.toasts,
                fieldFormats: data.fieldFormats,
                SearchBar: data.ui.SearchBar,
              }}
            />
          </Route>
          <Route path={['/patterns/:id']}>
            <EditIndexPatternContainer
              // indexPattern={data.indexPattern}
              getIndexPattern={data.indexPatterns.get}
              indexPatterns={indexPatterns}
              config={uiSettings}
              services={{
                notifications,
                docTitle: chrome.docTitle,
                overlays,
                indexPatternManagement: indexPatternManagementStart as IndexPatternManagementStart,
              }}
            />
          </Route>
          <Route path={['/']}>
            <IndexPatternTableWithRouter
              indexPatterns={indexPatterns}
              // navTo={kbnUrl.redirect}
              getIndexPatternCreationOptions={
                (indexPatternManagementStart as IndexPatternManagementStart).creation
                  .getIndexPatternCreationOptions
              }
              canSave={canSave}
            />
          </Route>
        </Switch>
      </HashRouter>
    </I18nProvider>,
    params.element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
}
