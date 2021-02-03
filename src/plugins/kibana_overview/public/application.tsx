/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';
import { NewsfeedApiEndpoint } from '../../../../src/plugins/newsfeed/public';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { AppPluginStartDependencies } from './types';
import { KibanaOverviewApp } from './components/app';

export const renderApp = (
  core: CoreStart,
  deps: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
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

  ReactDOM.render(
    <I18nProvider>
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
    </I18nProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
