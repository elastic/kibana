/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from 'react-router-dom';
import { UseQueryResult } from 'react-query';

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

import { CoreStart } from '@kbn/core/public';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

import { PLUGIN_ID, PLUGIN_NAME } from '../../common';
import { rpc } from '../rpc';

interface PluginBAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}

export const PluginBApp = ({ basename, notifications, navigation }: PluginBAppDeps) => {
  const [fetchData, setFetchData] = useState(true);
  const settle = () => setFetchData(false);
  const result = rpc.useQuery(['getSomethingFromB'], { enabled: fetchData, onSettled: settle });
  const resultFromA = rpc.useQuery(['somethingSpecialFromA'], {
    enabled: fetchData,
    onSettled: settle,
  });

  const rpcClient = rpc.useContext();

  const notifyError = (e: Error) => notifications.toasts.addError(e, { title: 'oh no!' });
  const notifySuccess = (r: object) => {
    notifications.toasts.addSuccess({ title: 'yeah!', text: JSON.stringify(r, null, 2) });
  };

  const onClickHandler = () => {
    // Imperative query
    rpcClient.fetchQuery(['getSomethingFromB']).then(notifySuccess).catch(notifyError);

    // Imperative mutation
    const procArgs = { inputA: 'test', inputB: 'test', inputC: 'test' };
    rpcClient.client.mutation('updateSomething', procArgs).then(notifySuccess).catch(notifyError);
  };

  const resultToOutput = (r: UseQueryResult) => {
    return r.isSuccess ? (
      <pre>{JSON.stringify(r.data)}</pre>
    ) : r.isError ? (
      <pre>{r.error as null}</pre>
    ) : r.isLoading ? (
      <pre>Loading...</pre>
    ) : null;
  };

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu
            appName={PLUGIN_ID}
            showSearchBar={true}
            useDefaultBehaviors={true}
          />
          <EuiPage restrictWidth="1000px">
            <EuiPageBody>
              <EuiPageHeader>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="pluginA.helloWorldText"
                      defaultMessage="{name}"
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
                        id="pluginA.congratulationsTitle"
                        defaultMessage="Congratulations, you have successfully created a new Kibana Plugin!"
                      />
                    </h2>
                  </EuiTitle>
                </EuiPageContentHeader>
                <EuiPageContentBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="pluginA.content"
                        defaultMessage="Look through the generated code and check out the plugin development documentation."
                      />
                    </p>
                    {resultToOutput(result)}
                    {resultToOutput(resultFromA)}
                    <EuiButton type="primary" size="s" onClick={onClickHandler}>
                      <FormattedMessage id="pluginA.buttonText" defaultMessage="Get data" />
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
