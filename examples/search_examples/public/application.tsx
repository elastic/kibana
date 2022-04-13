/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Redirect } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { AppPluginStartDependencies } from './types';
import { SearchExamplePage, ExampleLink } from './common/example_page';
import { SearchExamplesApp } from './search/app';
import { SearchSessionsExampleApp } from './search_sessions/app';
import { RedirectAppLinks } from '../../../src/plugins/kibana_react/public';
import { SqlSearchExampleApp } from './sql_search/app';

const LINKS: ExampleLink[] = [
  {
    path: '/search',
    title: 'Search',
  },
  {
    path: '/sql-search',
    title: 'SQL Search',
  },
  {
    path: '/search-sessions',
    title: 'Search Sessions',
  },
  {
    path: 'https://github.com/elastic/kibana/blob/main/src/plugins/data/README.mdx',
    title: 'README (GitHub)',
  },
];

export const renderApp = (
  { notifications, savedObjects, http, application }: CoreStart,
  { data, navigation, unifiedSearch }: AppPluginStartDependencies,
  { element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <I18nProvider>
      <RedirectAppLinks application={application}>
        <SearchExamplePage exampleLinks={LINKS} basePath={http.basePath}>
          <Router history={history}>
            <Route path={LINKS[0].path}>
              <SearchExamplesApp
                notifications={notifications}
                navigation={navigation}
                data={data}
                http={http}
                unifiedSearch={unifiedSearch}
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
              />
            </Route>

            <Route path="/" exact={true}>
              <Redirect to={LINKS[0].path} />
            </Route>
          </Router>
        </SearchExamplePage>
      </RedirectAppLinks>
    </I18nProvider>,
    element
  );

  return () => {
    data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
