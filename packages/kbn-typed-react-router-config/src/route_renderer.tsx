/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { CurrentRouteContextProvider } from './use_current_route';
import { Route, RouteMatch } from './types';
import { useRouter } from './use_router';

export function RouteRenderer<TRoutes extends Route[]>() {
  const router = useRouter<TRoutes>();
  const history = useHistory();

  const matches: RouteMatch[] = router.matchRoutes('/*' as never);

  console.log(matches);

  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unlistener = history.listen(() => {
      forceUpdate({});
    });

    return () => {
      unlistener();
    };
  });

  return matches
    .concat()
    .reverse()
    .reduce((prev, match) => {
      const { element } = match.route;
      return (
        <CurrentRouteContextProvider match={match} element={element}>
          {prev}
        </CurrentRouteContextProvider>
      );
    }, <></>);
}
