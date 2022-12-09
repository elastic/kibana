/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Routes, Route, Navigate } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { StartServicesAccessor } from '@kbn/core/public';

import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
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
  tooltip: i18n.translate('indexPatternManagement.dataViews.badge.readOnly.tooltip', {
    defaultMessage: 'Unable to save data views',
  }),
  iconType: 'glasses',
};

export async function mountManagementSection(
  getStartServices: StartServicesAccessor<IndexPatternManagementStartDependencies>,
  params: ManagementAppMountParams
) {
  const [
    { application, chrome, uiSettings, notifications, overlays, http, docLinks, theme },
    {
      data,
      dataViewFieldEditor,
      dataViewEditor,
      dataViews,
      fieldFormats,
      unifiedSearch,
      spaces,
      savedObjectsManagement,
    },
    indexPatternManagementStart,
  ] = await getStartServices();
  const canSave = dataViews.getCanSaveSync();

  if (!canSave) {
    chrome.setBadge(readOnlyBadge);
  }

  const deps: IndexPatternManagmentContext = {
    application,
    chrome,
    uiSettings,
    notifications,
    overlays,
    unifiedSearch,
    http,
    docLinks,
    data,
    dataViewFieldEditor,
    dataViews,
    indexPatternManagementStart: indexPatternManagementStart as IndexPatternManagementStart,
    setBreadcrumbs: params.setBreadcrumbs,
    fieldFormatEditors: dataViewFieldEditor.fieldFormatEditors,
    IndexPatternEditor: dataViewEditor.IndexPatternEditorComponent,
    fieldFormats,
    spaces,
    theme,
    savedObjectsManagement,
  };

  const App = () => {
    return (
      <KibanaContextProvider services={deps}>
        <KibanaThemeProvider theme$={theme.theme$}>
          <I18nProvider>
            <Router navigator={params.history} location={params.history.location}>
              <Routes>
                <Route
                  path="/create"
                  element={
                    <IndexPatternTableWithRouter canSave={canSave} showCreateDialog={true} />
                  }
                />
                {['/dataView/:id/field/:fieldName', '/dataView/:id/create-field/'].map((path) => (
                  <Route path={path} element={<CreateEditFieldContainer />} />
                ))}
                <Route path="/dataView/:id" element={<EditIndexPatternContainer />} />
                <Route path="/patterns*" element={<Navigate to={'dataView*'} />} />
                <Route path="/" element={<IndexPatternTableWithRouter canSave={canSave} />} />
              </Routes>
            </Router>
          </I18nProvider>
        </KibanaThemeProvider>
      </KibanaContextProvider>
    );
  };

  ReactDOM.render(<App />, params.element);

  return () => {
    chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(params.element);
  };
}
