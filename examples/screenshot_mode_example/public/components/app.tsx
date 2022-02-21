/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { CoreStart } from '../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import {
  ScreenshotModePluginSetup,
  KBN_SCREENSHOT_MODE_HEADER,
} from '../../../../src/plugins/screenshot_mode/public';

import { PLUGIN_NAME, BASE_API_ROUTE } from '../../common';

interface ScreenshotModeExampleAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
  screenshotMode: ScreenshotModePluginSetup;
}

export const ScreenshotModeExampleApp = ({
  basename,
  notifications,
  http,
  navigation,
  screenshotMode,
}: ScreenshotModeExampleAppDeps) => {
  const isScreenshotMode = screenshotMode.isScreenshotMode();

  useEffect(() => {
    // fire and forget
    http.get(`${BASE_API_ROUTE}/check_is_screenshot`, {
      headers: isScreenshotMode ? { [KBN_SCREENSHOT_MODE_HEADER]: 'true' } : undefined,
    });
    notifications.toasts.addInfo({
      title: 'Welcome to the screenshot example app!',
      text: isScreenshotMode
        ? 'In screenshot mode we want this to remain visible'
        : 'In normal mode this toast will disappear eventually',
      toastLifeTimeMs: isScreenshotMode ? 360000 : 3000,
    });
  }, [isScreenshotMode, notifications, http]);
  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu
            appName={PLUGIN_NAME}
            showSearchBar={true}
            useDefaultBehaviors={true}
          />
          <EuiPage restrictWidth="1000px">
            <EuiPageBody>
              <EuiPageHeader>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="screenshotModeExample.helloWorldText"
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
                      {isScreenshotMode ? (
                        <FormattedMessage
                          id="screenshotModeExample.screenshotModeTitle"
                          defaultMessage="We are in screenshot mode!"
                        />
                      ) : (
                        <FormattedMessage
                          id="screenshotModeExample.normalModeTitle"
                          defaultMessage="We are not in screenshot mode!"
                        />
                      )}
                    </h2>
                  </EuiTitle>
                </EuiPageContentHeader>
                <EuiPageContentBody>
                  <EuiText>
                    {isScreenshotMode ? (
                      <p>We detected screenshot mode. The chrome navbar should be hidden.</p>
                    ) : (
                      <p>
                        This is how the app looks in normal mode. The chrome navbar should be
                        visible.
                      </p>
                    )}
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
