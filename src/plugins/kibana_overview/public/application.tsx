/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { NewsfeedApiEndpoint } from '@kbn/newsfeed-plugin/public';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { AppPluginStartDependencies } from './types';
import { KibanaOverviewApp } from './components/app';

export const renderApp = (
  core: CoreStart,
  deps: AppPluginStartDependencies,
  { appBasePath, element, theme$ }: AppMountParameters
) => {
  const { notifications, http } = core;
  const { newsfeed, home, navigation } = deps;
  const newsfeed$ = newsfeed?.createNewsFeed$(NewsfeedApiEndpoint.KIBANA_ANALYTICS);
  const navLinks = core.chrome.navLinks.getAll();
  const solutions = home.featureCatalogue
    .getSolutions()
    .filter(({ id }) => id !== 'kibana')
    .filter(({ id }) => navLinks.find(({ category, hidden }) => !hidden && category?.id === id));
  const features = home.featureCatalogue.get();

  core.chrome.setBreadcrumbs([
    { text: i18n.translate('kibanaOverview.breadcrumbs.title', { defaultMessage: 'Analytics' }) },
  ]);

  ReactDOM.render(
    <I18nProvider>
      <KibanaThemeProvider theme$={theme$}>
        <KibanaContextProvider services={{ ...core, ...deps }}>
          <KibanaOverviewApp
            basename={appBasePath}
            notifications={notifications}
            http={http}
            navigation={navigation}
            newsfeed$={newsfeed$}
            solutions={solutions}
            features={features}
          />
        </KibanaContextProvider>
      </KibanaThemeProvider>
    </I18nProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
