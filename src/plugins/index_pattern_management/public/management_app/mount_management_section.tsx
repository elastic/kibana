/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch, Route } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { StartServicesAccessor } from 'src/core/public';

import { KibanaContextProvider } from '../../../kibana_react/public';
import { ManagementAppMountParams } from '../../../management/public';
import {
  IndexPatternTableWithRouter,
  EditIndexPatternContainer,
  CreateEditFieldContainer,
} from '../components';
import { IndexPatternManagementStartDependencies, IndexPatternManagementStart } from '../plugin';
import { IndexPatternManagmentContext } from '../types';

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
    { chrome, application, uiSettings, notifications, overlays, http, docLinks },
    { data, indexPatternFieldEditor, indexPatternEditor },
    indexPatternManagementStart,
  ] = await getStartServices();
  const canSave = Boolean(application.capabilities.indexPatterns.save);

  if (!canSave) {
    chrome.setBadge(readOnlyBadge);
  }

  const deps: IndexPatternManagmentContext = {
    chrome,
    application,
    uiSettings,
    notifications,
    overlays,
    http,
    docLinks,
    data,
    indexPatternFieldEditor,
    indexPatternManagementStart: indexPatternManagementStart as IndexPatternManagementStart,
    setBreadcrumbs: params.setBreadcrumbs,
    fieldFormatEditors: indexPatternFieldEditor.fieldFormatEditors,
    IndexPatternEditor: indexPatternEditor.IndexPatternEditorComponent,
  };

  ReactDOM.render(
    <KibanaContextProvider services={deps}>
      <I18nProvider>
        <Router history={params.history}>
          <Switch>
            <Route path={['/create']}>
              <IndexPatternTableWithRouter canSave={canSave} showCreateDialog={true} />
            </Route>
            <Route path={['/patterns/:id/field/:fieldName', '/patterns/:id/create-field/']}>
              <CreateEditFieldContainer />
            </Route>
            <Route path={['/patterns/:id']}>
              <EditIndexPatternContainer />
            </Route>
            <Route path={['/']}>
              <IndexPatternTableWithRouter canSave={canSave} />
            </Route>
          </Switch>
        </Router>
      </I18nProvider>
    </KibanaContextProvider>,
    params.element
  );

  return () => {
    chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(params.element);
  };
}
