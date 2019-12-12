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

import React from 'react';
import { NotificationsSetup } from 'kibana/public';
import { ServicesContextProvider, EditorContextProvider, RequestContextProvider } from './contexts';
import { Main } from './containers';
import { createStorage, createHistory, createSettings, Settings } from '../services';

let settingsRef: Settings;
export function legacyBackDoorToSettings() {
  return settingsRef;
}

export function boot(deps: {
  docLinkVersion: string;
  I18nContext: any;
  notifications: NotificationsSetup;
  elasticsearchUrl: string;
}) {
  const { I18nContext, notifications, docLinkVersion, elasticsearchUrl } = deps;

  const storage = createStorage({
    engine: window.localStorage,
    prefix: 'sense:',
  });
  const history = createHistory({ storage });
  const settings = createSettings({ storage });
  settingsRef = settings;

  return (
    <I18nContext>
      <ServicesContextProvider
        value={{
          elasticsearchUrl,
          docLinkVersion,
          services: { storage, history, settings, notifications },
        }}
      >
        <RequestContextProvider>
          <EditorContextProvider settings={settings.toJSON()}>
            <Main />
          </EditorContextProvider>
        </RequestContextProvider>
      </ServicesContextProvider>
    </I18nContext>
  );
}
