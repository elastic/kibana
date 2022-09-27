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
import { CoreThemeProvider } from '@kbn/core-theme-browser-internal';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { NotificationsSetup } from '@kbn/core-notifications-browser';
import type { AppMountParameters } from '@kbn/core-application-browser';
import { StatusApp } from './status_app';

interface Deps {
  http: HttpSetup;
  notifications: NotificationsSetup;
}

export const renderApp = (
  { element, theme$ }: AppMountParameters,
  { http, notifications }: Deps
) => {
  const root = createRoot(element);

  root.render(
    <I18nProvider>
      <CoreThemeProvider theme$={theme$}>
        <StatusApp http={http} notifications={notifications} />
      </CoreThemeProvider>
    </I18nProvider>
  );

  return () => {
    root.unmount();
  };
};
