/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './app.scss';
import React, { useEffect } from 'react';
import { Route, Switch, useLocation } from 'react-router-dom';

import { syncQueryStateWithUrl } from '../../../data/public';
import { useKibana } from '../../../kibana_react/public';
import { VisualizeServices } from './types';
import { VisualizeEditor, VisualizeListing, VisualizeNoMatch } from './components';
import { VisualizeConstants } from './visualize_constants';

export const VisualizeApp = () => {
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
      <Route path={[VisualizeConstants.CREATE_PATH, `${VisualizeConstants.EDIT_PATH}/:id`]}>
        <VisualizeEditor />
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
