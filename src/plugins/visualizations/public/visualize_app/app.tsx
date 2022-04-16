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

import { AppMountParameters } from '@kbn/core/public';
import { syncQueryStateWithUrl } from '@kbn/data-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { VisualizeServices } from './types';
import {
  VisualizeEditor,
  VisualizeListing,
  VisualizeNoMatch,
  VisualizeByValueEditor,
} from './components';
import { VisualizeConstants } from '../../common/constants';

export interface VisualizeAppProps {
  onAppLeave: AppMountParameters['onAppLeave'];
}

export const VisualizeApp = ({ onAppLeave }: VisualizeAppProps) => {
  const {
    services: {
      data: { query },
      kbnUrlStateStorage,
    },
  } = useKibana<VisualizeServices>();
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
      <Route exact path={`${VisualizeConstants.EDIT_BY_VALUE_PATH}`}>
        <VisualizeByValueEditor onAppLeave={onAppLeave} />
      </Route>
      <Route path={[VisualizeConstants.CREATE_PATH, `${VisualizeConstants.EDIT_PATH}/:id`]}>
        <VisualizeEditor onAppLeave={onAppLeave} />
      </Route>
      <Route
        exact
        path={[VisualizeConstants.LANDING_PAGE_PATH, VisualizeConstants.WIZARD_STEP_1_PAGE_PATH]}
      >
        <VisualizeListing />
      </Route>
      <VisualizeNoMatch />
    </Switch>
  );
};
