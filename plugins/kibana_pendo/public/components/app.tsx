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
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { CoreStart } from '../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

import { PLUGIN_ID } from '../../common';

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
  const [apiKey, setApiKey] = useState<string | undefined>();
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();
  


  const onClickHandler = () => {
    setInit("" + !(typeof window.pendo === 'undefined' || window.pendo === null));
    setEnabled("" + window.pendo.getURL().includes("analyticsEnabled=true"));
    setReady("" + window.pendo?.isReady());
    setUser("" + window.pendo?.visitorId);
    setAccount("" + window.pendo?.accountId)
    setApiKey(window.pendo?.apiKey.substring(0,6) + "...");
    setLastUpdated("" + new Date().toISOString());
  };

  const onClickHandlerGetUrl = async() => {
    let url = window.pendo.getURL();
    let permissionStatus = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
    if(permissionStatus.state === "granted"){
      navigator.clipboard.writeText(url);
      notifications.toasts.addSuccess("Kibana Url Copied");
    }
    else{
      notifications.toasts.addWarning("Failed to write to clipboard. The url was written to the console instead.");
      console.log(url);
    }
  };

  const onClickHandlerGetDashboardUrl = async() => {
    let dashboardUrl = window.pendo.getURL().replace("kibanaPendo", "dashboards#/view/0b2c74c0-1959-11ed-87c7-5dee0fd0d6d1");
    let permissionStatus = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
    if(permissionStatus.state === "granted"){
      navigator.clipboard.writeText(dashboardUrl);
      notifications.toasts.addSuccess("Kibana Url Copied");
    }
    else{
      notifications.toasts.addWarning("Failed to write to clipboard. The url was written to the console instead.");
      console.log(dashboardUrl);
    }
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
                    <p>Api Key: {apiKey}</p>
                    <EuiHorizontalRule />
                    <p>Updated: {lastUpdated}</p>
                    <EuiHorizontalRule />
                    <EuiButton type="primary" size="s" onClick={onClickHandler}>
                      <FormattedMessage id="kibanaPendo.buttonText" defaultMessage="Get Status" />
                    </EuiButton>
                    <EuiHorizontalRule />
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <EuiButton type="primary" size="s" onClick={onClickHandlerGetUrl}>
                          <FormattedMessage id="kibanaPendo.buttonText" defaultMessage="Copy Plugin Url" />
                        </EuiButton>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                      <EuiButton type="primary" size="s" onClick={onClickHandlerGetDashboardUrl}>
                        <FormattedMessage id="kibanaPendo.buttonText" defaultMessage="Copy Dashboard Url" />
                      </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
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
