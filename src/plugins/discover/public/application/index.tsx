/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch, Route, Redirect } from 'react-router-dom';

import { AppMountParameters } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { getServices } from '../kibana_services';
import { DiscoverMainRoute } from './apps/main';
import { ContextAppRoute } from './apps/context';
import { SingleDocRoute } from './apps/doc';
import { NotFoundRoute } from './apps/not_found';
import { KibanaContextProvider } from '../../../kibana_react/public';

export const renderApp = ({ element }: AppMountParameters) => {
  const services = getServices();
  const { history, capabilities, chrome, data } = services;
  const opts = {
    services,
    history: history(),
    navigateTo: (path: string) => {
      history().push(path);
    },
    indexPatternList: [],
  };
  if (!capabilities.discover.save) {
    chrome.setBadge({
      text: i18n.translate('discover.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('discover.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save searches',
      }),
      iconType: 'glasses',
    });
  }
  const app = (
    <Router history={history()}>
      <KibanaContextProvider services={services}>
        <Switch>
          <Route
            path="/context/:indexPatternId/:id"
            children={<ContextAppRoute indexPatternList={[]} services={services} />}
          />
          <Route
            path="/doc/:indexPattern/:index/:type"
            render={(props) => (
              <Redirect
                to={`/doc/${props.match.params.indexPattern}/${props.match.params.index}`}
              />
            )}
          />
          <Route
            path="/doc/:indexPatternId/:index"
            children={<SingleDocRoute services={services} />}
          />
          <Route path="/view/:id" children={<DiscoverMainRoute opts={opts} />} />
          <Route path="/" exact children={<DiscoverMainRoute opts={opts} />} />
          <Route path="/*">
            <NotFoundRoute services={services} />
          </Route>
        </Switch>
      </KibanaContextProvider>
    </Router>
  );
  ReactDOM.render(app, element);

  return () => {
    data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
