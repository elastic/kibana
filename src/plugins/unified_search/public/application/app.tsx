/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './app.scss';
import React, { useEffect } from 'react';
import { Route, Switch, useLocation } from 'react-router-dom';

import { AppMountParameters } from 'kibana/public';
import { syncQueryStateWithUrl } from '../../../data/public';
import { useKibana } from '../../../kibana_react/public';
import { UnifiedSearchServices } from './types';
import { UnifiedSearchWrapper } from './components';

export interface UnifiedSearchAppProps {
  onAppLeave: AppMountParameters['onAppLeave'];
}

export const UnifiedSearchApp = ({ onAppLeave }: UnifiedSearchAppProps) => {
  const {
    services: {
      data: { query },
      kbnUrlStateStorage,
    },
  } = useKibana<UnifiedSearchServices>();
  const { pathname } = useLocation();

  useEffect(() => {
    // syncs `_g` portion of url with query services
    const { stop } = syncQueryStateWithUrl(query, kbnUrlStateStorage);

    return () => stop();

    // this effect should re-run when pathname is changed to preserve querystring part,
    // so the global state is always preserved
  }, [query, kbnUrlStateStorage, pathname]);

  return (
    <Switch>
      <Route exact path={'/'}>
        <UnifiedSearchWrapper onAppLeave={onAppLeave} />
      </Route>
    </Switch>
  );
};
