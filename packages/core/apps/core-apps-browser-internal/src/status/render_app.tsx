/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { NotificationsSetup } from '@kbn/core-notifications-browser';
import type { AppMountParameters } from '@kbn/core-application-browser';
import { StatusApp } from './status_app';

interface Deps {
  http: InternalHttpSetup;
  notifications: NotificationsSetup;
}

export const renderApp = (
  { element, theme$ }: AppMountParameters,
  { http, notifications }: Deps
) => {
  const root = createRoot(element);

  root.render(
    <I18nProvider>
      <KibanaThemeProvider theme={{ theme$ }}>
        <StatusApp http={http} notifications={notifications} />
      </KibanaThemeProvider>
    </I18nProvider>
  );

  return () => {
    root.unmount();
  };
};
