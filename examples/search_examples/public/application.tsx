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
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { PLUGIN_ID } from '../common';
import type { AppPluginStartDependencies } from './types';
import type { ExampleLink } from './common/example_page';
import { SearchExamplePage } from './common/example_page';
import { SearchExamplesApp } from './search/app';
import { SearchSessionsExampleApp } from './search_sessions/app';
import { SqlSearchExampleApp } from './sql_search/app';

export const renderApp = (
  { notifications, http, application: _application, ...startServices }: CoreStart,
  { data, navigation, unifiedSearch }: AppPluginStartDependencies,
  { element, history }: AppMountParameters
) => {
  const LINKS: ExampleLink[] = [
    {
      path: '/search',
      href: http.basePath.prepend(`/app/${PLUGIN_ID}/search`),
      title: 'Search',
    },
    {
      path: '/sql-search',
      href: http.basePath.prepend(`/app/${PLUGIN_ID}/sql-search`),
      title: 'SQL Search',
    },
    {
      path: '/search-sessions',
      href: http.basePath.prepend(`/app/${PLUGIN_ID}/search-sessions`),
      title: 'Search Sessions',
    },
    {
      path: '',
      href: 'https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/data/README.mdx',
      title: 'README (GitHub)',
    },
  ];

  ReactDOM.render(
    startServices.rendering.addContext(
      <I18nProvider>
        <SearchExamplePage exampleLinks={LINKS}>
          <Router history={history}>
            <Routes>
              <Route path={LINKS[0].path}>
                <SearchExamplesApp
                  notifications={notifications}
                  navigation={navigation}
                  data={data}
                  http={http}
                  unifiedSearch={unifiedSearch}
                  {...startServices}
                />
              </Route>
              <Route path={LINKS[1].path}>
                <SqlSearchExampleApp notifications={notifications} data={data} />
              </Route>
              <Route path={LINKS[2].path}>
                <SearchSessionsExampleApp
                  navigation={navigation}
                  notifications={notifications}
                  data={data}
                  unifiedSearch={unifiedSearch}
                  {...startServices}
                />
              </Route>
              <Route path="/" exact={true}>
                <Redirect to={LINKS[0].path} />
              </Route>
            </Routes>
          </Router>
        </SearchExamplePage>
      </I18nProvider>
    ),
    element
  );

  return () => {
    data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
