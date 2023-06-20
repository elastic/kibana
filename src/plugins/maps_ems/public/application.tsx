/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Switch } from 'react-router-dom';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Route } from '@kbn/shared-ux-router';
import { EmsPage } from './components';
import { createEMSSettings } from '../common/ems_settings';
import { getMapConfig, getKibanaVersion } from './kibana_services';
import { createEMSClient } from './lazy_load_bundle/create_ems_client';

export async function renderApp({
  coreStart,
  usageCollection,
  appMountParameters,
}: {
  coreStart: CoreStart;
  usageCollection?: UsageCollectionSetup;
  appMountParameters: AppMountParameters;
}) {
  const { element, history, theme$ } = appMountParameters;
  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  const I18nContext = coreStart.i18n.Context;
  const emsSettings = createEMSSettings(getMapConfig(), () => false);
  const emsClient = createEMSClient(emsSettings, getKibanaVersion());

  render(
    <ApplicationUsageTrackingProvider>
      <I18nContext>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider services={{ emsClient }}>
            <Router history={history}>
              <Switch>
                <Route exact path={`/`} component={EmsPage} />
                {/* Alternatively, these could be query strings rather than paths */}
                <Route path={`/basemap/:basemapId/layer/:layerId`} component={EmsPage} />
                <Route path={`/basemap/:basemapId`} component={EmsPage} />
                <Route path={`/layer/:layerId`} component={EmsPage} />
              </Switch>
            </Router>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </I18nContext>
    </ApplicationUsageTrackingProvider>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
}
