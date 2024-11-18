/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { NotificationsSetup } from '@kbn/core-notifications-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { AppMountParameters } from '@kbn/core-application-browser';
import { StatusApp } from './status_app';

interface Deps {
  http: InternalHttpSetup;
  notifications: NotificationsSetup;
  userProfile: UserProfileService;
}

export const renderApp = (
  { element, theme$ }: AppMountParameters,
  { http, notifications, userProfile }: Deps
) => {
  ReactDOM.render(
    <I18nProvider>
      <KibanaThemeProvider theme={{ theme$ }} userProfile={userProfile}>
        <StatusApp http={http} notifications={notifications} />
      </KibanaThemeProvider>
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
