import React, { useState } from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { BrowserRouter as Router } from 'react-router-dom';

import {
  EuiButton,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { CoreStart } from '../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

import { PLUGIN_ID, PLUGIN_NAME } from '../../common';
import { last } from 'lodash';

interface KibanaPendoAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}

export const KibanaPendoApp = ({
  basename,
  notifications,
  http,
  navigation,
}: KibanaPendoAppDeps) => {
  // Use React hooks to manage state.
  const [init, setInit] = useState<string | undefined>();
  const [enabled, setEnabled] = useState<string | undefined>();
  const [ready, setReady] = useState<string | undefined>();
  const [user, setUser] = useState<string | undefined>();
  const [account, setAccount] = useState<string | undefined>();
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();

  const onClickHandler = () => {
    setInit("" + !(typeof window.pendo === 'undefined' || window.pendo === null));
    setEnabled("" + window.pendo.getURL().includes("analyticsEnabled=true"));
    setReady("" + window.pendo?.isReady());
    setUser("" + window.pendo?.visitorId);
    setAccount("" + window.pendo?.accountId)
    setLastUpdated("" + new Date().toISOString());
  };

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu
            appName={PLUGIN_ID.toLowerCase()}
            showSearchBar={true}
            useDefaultBehaviors={true}
          />
          <EuiPage restrictWidth="1000px">
            <EuiPageBody>
              <EuiPageHeader>
                <EuiTitle size="l">
                  <h1>Status of Pendo Plugin</h1>
                </EuiTitle>
              </EuiPageHeader>
              <EuiPageContent>
                <EuiPageContentBody>
                  <EuiText>
                    <p>Initialized: {init}</p>
                    <p>Enabled: {enabled}</p>
                    <EuiHorizontalRule />
                    <p>Ready: {ready}</p>
                    <p>Pendo User: {user}</p>
                    <p>Pendo Account: {account}</p>
                    <EuiHorizontalRule />
                    <p>Updated: {lastUpdated}</p>
                    <EuiHorizontalRule />
                    <EuiButton type="primary" size="s" onClick={onClickHandler}>
                      <FormattedMessage id="kibanaPendo.buttonText" defaultMessage="Get Status" />
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
