/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
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

import { CoreStart } from '@kbn/core/public';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

import { UseQueryResult } from 'react-query';
import { PLUGIN_ID, PLUGIN_NAME } from '../../common';
import { rpc } from '../rpc';

interface PluginBAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}

export const PluginBApp = ({ basename, notifications, navigation }: PluginBAppDeps) => {
  const result = rpc.useQuery(['getSomethingFromB']);
  const resultFromA = rpc.useQuery(['somethingSpecialFromA']);

  const c = rpc.useContext();

  const onClickHandler = () => {
    c.fetchQuery(['getSomethingFromB'])
      .then((r) => {
        notifications.toasts.addSuccess({ title: 'yeah!', text: JSON.stringify(r, null, 2) });
      })
      .catch((e) => notifications.toasts.addError(e, { title: 'oh no!' }));
    c.client.mutation('updateSomething', { inputA: 'test', inputB: 'test' });
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
