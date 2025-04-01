/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { NewsfeedApiEndpoint } from '@kbn/newsfeed-plugin/public';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
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
  const features$ = home.featureCatalogue.getFeatures$();

  core.chrome.setBreadcrumbs([
    { text: i18n.translate('kibanaOverview.breadcrumbs.title', { defaultMessage: 'Analytics' }) },
  ]);

  core.chrome.navLinks.getNavLinks$().subscribe((navLinks) => {
    const solutions = home.featureCatalogue
      .getSolutions()
      .filter(({ id }) => id !== 'kibana')
      .filter(({ id }) =>
        navLinks.find(
          ({ category, visibleIn }) => visibleIn.includes('kibanaOverview') && category?.id === id
        )
      );

    ReactDOM.render(
      <KibanaRenderContextProvider {...core}>
        <KibanaContextProvider services={{ ...core, ...deps }}>
          <KibanaOverviewApp
            basename={appBasePath}
            {...{ notifications, http, navigation, newsfeed$, solutions, features$ }}
          />
        </KibanaContextProvider>
      </KibanaRenderContextProvider>,
      element
    );
  });

  return () => ReactDOM.unmountComponentAtNode(element);
};
