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
import ReactDOM from 'react-dom';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { BrowserRouter as Router } from 'react-router-dom';

import {
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { AppMountParameters, CoreStart } from '<%= relRoot %>/../src/core/public';
import { NavigationPublicPluginStart } from '<%= relRoot %>/../src/plugins/navigation/public';

import { PLUGIN_ID, PLUGIN_NAME } from '../../common';

interface <%= upperCamelCaseName %>AppDeps { 
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
};

const <%= upperCamelCaseName %>App = ({ basename, notifications, http, navigation }: <%= upperCamelCaseName %>AppDeps) => {
  const [timestamp, setTimestamp] = useState<string | undefined>();
  const fetchData = () => {
    http.get('/api/<%= snakeCase(name) %>/example').then((res) => {
      setTimestamp(res.time);
      notifications.toasts.addSuccess(PLUGIN_NAME);
    });
  };

  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu
            appName={ PLUGIN_ID }
            showSearchBar={true}
          />
          <EuiPage>
            <EuiPageBody>
              <EuiPageHeader>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="<%= camelCase(name) %>.helloWorldText"
                      defaultMessage="Hello {name}!"
                      values={{ name: PLUGIN_NAME }}
                    />
                  </h1>
                </EuiTitle>
              </EuiPageHeader>
              <EuiPageContent>
                <EuiPageContentHeader>
                  <EuiTitle>
                    <h2>
                      <FormattedMessage
                        id="<%= camelCase(name) %>.congratulationsTitle"
                        defaultMessage="Congratulations"
                      />
                    </h2>
                  </EuiTitle>
                </EuiPageContentHeader>
                <EuiPageContentBody>
                  <EuiText>
                    <h3>
                      <FormattedMessage
                        id="<%= camelCase(name) %>.congratulationsText"
                        defaultMessage="You have successfully created your first Kibana Plugin!"
                      />
                    </h3>
                    <p>
                      <FormattedMessage
                        id="banana.serverTimeText"
                        defaultMessage="Last response from server: {time}"
                        values={{ time: timestamp ? timestamp : 'Unknown' }}
                        />
                    </p>
                    <EuiButton 
                      type="primary" 
                      size="s" 
                      onClick={fetchData}
                    >
                      <FormattedMessage
                        id="<%= camelCase(name) %>.buttonText"
                        defaultMessage="Fetch data"
                      />
                    </EuiButton>
                  </EuiText>
                </EuiPageContentBody>
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        </>
      </I18nProvider>
    </Router>
  );
};

export const renderApp = (
  { notifications, http }: CoreStart,
  { navigation }: any,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(<<%= upperCamelCaseName %>App basename={appBasePath} notifications={notifications} http={http} navigation={navigation}/>, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
