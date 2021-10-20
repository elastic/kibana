/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Redirect, Route, Router, Switch } from 'react-router-dom';
import React, { Fragment } from 'react';
import { History } from 'history';
import { css, Global } from '@emotion/react';
import { KibanaContextProvider } from '../../../kibana_react/public';
import { ContextAppRoute } from './apps/context';
import { SingleDocRoute } from './apps/doc';
import { DiscoverMainRoute } from './apps/main';
import { NotFoundRoute } from './apps/not_found';
import { DiscoverServices } from '../build_services';
import { DiscoverMainProps } from './apps/main/discover_main_route';
import { TRUNCATE_MAX_HEIGHT } from '../../common';

const TRUNCATE_GRADIENT_HEIGHT = 15;

export const discoverRouter = (services: DiscoverServices, history: History) => {
  const mainRouteProps: DiscoverMainProps = {
    services,
    history,
  };
  const maxHeight = services.uiSettings.get(TRUNCATE_MAX_HEIGHT);

  const truncateStyles = (
    <Global
      styles={css`
        .truncate-by-height {
          overflow: hidden;
          max-height: ${maxHeight > 0 ? `${maxHeight}px !important` : 'none'};
          display: inline-block;
        }
        .truncate-by-height:before {
          top: ${maxHeight > 0
            ? maxHeight - TRUNCATE_GRADIENT_HEIGHT
            : TRUNCATE_GRADIENT_HEIGHT * -1}px;
        }
      `}
    />
  );

  return (
    <Fragment>
      {maxHeight !== 0 && truncateStyles}
      <KibanaContextProvider services={services}>
        <Router history={history} data-test-subj="discover-react-router">
          <Switch>
            <Route
              path="/context/:indexPatternId/:id"
              children={<ContextAppRoute services={services} />}
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
            <Route path="/view/:id" children={<DiscoverMainRoute {...mainRouteProps} />} />
            <Route path="/" exact children={<DiscoverMainRoute {...mainRouteProps} />} />
            <NotFoundRoute services={services} />
          </Switch>
        </Router>
      </KibanaContextProvider>
    </Fragment>
  );
};
