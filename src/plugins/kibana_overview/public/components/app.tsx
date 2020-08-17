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

import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import {
  ChromeStart,
  DocLinksStart,
  HttpStart,
  NotificationsSetup,
  OverlayStart,
  SavedObjectsClientContract,
  IUiSettingsClient,
  ApplicationStart,
} from 'kibana/public';
import { CoreStart } from '../../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../../src/plugins/navigation/public';

import { PLUGIN_ID, PLUGIN_NAME } from '../../common';
import { Overview } from './overview';

interface KibanaOverviewAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
  savedObjectsClient: SavedObjectsClientContract;
  uiSettings: IUiSettingsClient;
}

export const KibanaOverviewApp = ({
  basename,
  notifications,
  http,
  navigation,
}: KibanaOverviewAppDeps) => {
  console.log({ basename, notifications, http, navigation });

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router basename={basename}>
      <I18nProvider>
        <Switch>
          <Route exact path="/">
            <Overview />
          </Route>
        </Switch>
      </I18nProvider>
    </Router>
  );
};
