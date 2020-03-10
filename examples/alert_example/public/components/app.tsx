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
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { BrowserRouter as Router } from 'react-router-dom';
import {
  EuiButton,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import {
  AlertsContextProvider,
  AlertAdd,
} from '../../../../x-pack/plugins/triggers_actions_ui/public';

import { CoreStart, IUiSettingsClient, ToastsSetup } from '../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

import { PLUGIN_ID, PLUGIN_NAME } from '../../common';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { ChartsPluginStart } from '../../../../src/plugins/charts/public';

interface AlertExampleAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
  triggers_actions_ui: any;
  dataPlugin: DataPublicPluginStart;
  charts: ChartsPluginStart;
  uiSettings: IUiSettingsClient;
  toastNotifications: ToastsSetup;
}

export const AlertExampleApp = ({
  basename,
  notifications,
  http,
  navigation,
  triggers_actions_ui,
  charts,
  uiSettings,
  dataPlugin,
  toastNotifications,
}: AlertExampleAppDeps) => {
  // Use React hooks to manage state.
  const [timestamp, setTimestamp] = useState<string | undefined>();
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);

  const onClickHandler = () => {
    // Use the core http service to make a response to the server API.
    http.get('/api/alert_example/example').then(res => {
      setTimestamp(res.time);
      // Use the core notifications service to display a success message.
      notifications.toasts.addSuccess(
        i18n.translate('alertExample.dataUpdated', {
          defaultMessage: 'Data updated',
        })
      );
    });
  };

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu appName={PLUGIN_ID} showSearchBar={true} />
          <EuiPage restrictWidth="1000px">
            <EuiPageBody>
              <EuiPageHeader>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="alertExample.helloWorldText"
                      defaultMessage="{name}"
                      values={{ name: PLUGIN_NAME }}
                    />
                  </h1>
                </EuiTitle>
              </EuiPageHeader>
              <EuiPageContent>
                <EuiPageContentBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="alertExample.content"
                        defaultMessage="Test app that registers and creates its own alerts and actions."
                      />
                    </p>
                    <EuiHorizontalRule />
                    {/* <p>
                      <FormattedMessage
                        id="alertExample.timestampText"
                        defaultMessage="Last timestamp: {time}"
                        values={{ time: timestamp ? timestamp : 'Unknown' }}
                      />
                    </p> */}
                    {/* <EuiButton type="primary" size="s" onClick={onClickHandler}>
                      <FormattedMessage id="alertExample.buttonText" defaultMessage="Get data" />
                    </EuiButton> */}
                    <EuiButton
                      type="primary"
                      size="s"
                      onClick={() => setAlertFlyoutVisibility(true)}
                    >
                      <FormattedMessage
                        id="alertExample.testAlertButtonText"
                        defaultMessage="Invoke alert creation flyout"
                      />
                    </EuiButton>
                  </EuiText>
                </EuiPageContentBody>
              </EuiPageContent>
              <AlertsContextProvider
                value={{
                  http,
                  actionTypeRegistry: triggers_actions_ui.actionTypeRegistry,
                  alertTypeRegistry: triggers_actions_ui.alertTypeRegistry,
                  toastNotifications,
                  uiSettings,
                  charts,
                  dataFieldsFormats: dataPlugin.fieldFormats,
                }}
              >
                <AlertAdd
                  consumer={'workbench'}
                  addFlyoutVisible={alertFlyoutVisible}
                  setAddFlyoutVisibility={setAlertFlyoutVisibility}
                />
              </AlertsContextProvider>
            </EuiPageBody>
          </EuiPage>
        </>
      </I18nProvider>
    </Router>
  );
};
