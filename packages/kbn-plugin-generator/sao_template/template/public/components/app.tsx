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
}

export const <%= upperCamelCaseName %>App = ({ basename, notifications, http, navigation }: <%= upperCamelCaseName %>AppDeps) => {
  // Use React hooks to manage state.
  const [timestamp, setTimestamp] = useState<string | undefined>();

  const onClickHandler = () => {
<%_ if (generateApi) { -%>
    // Use the core http service to make a response to the server API.
    http.get('/api/<%= snakeCase(name) %>/example').then(res => {
      setTimestamp(res.time);
      // Use the core notifications service to display a success message.
      notifications.toasts.addSuccess(PLUGIN_NAME);
    });
<%_ } else { -%>
    setTimestamp(new Date().toISOString());
    notifications.toasts.addSuccess(PLUGIN_NAME);
<%_ } -%>
  };

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu appName={ PLUGIN_ID } showSearchBar={true} />
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
                        id="banana.timestampText"
                        defaultMessage="Last timestamp: {time}"
                        values={{ time: timestamp ? timestamp : 'Unknown' }}
                      />
                    </p>
                    <EuiButton type="primary" size="s" onClick={onClickHandler}>
                      <FormattedMessage id="<%= camelCase(name) %>.buttonText" defaultMessage="<%_ if (generateApi) { -%>Fetch data<%_ } else { -%>Click me<%_ } -%>" />
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
