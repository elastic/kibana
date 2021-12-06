/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppMountParameters } from '../../application';
import type { HttpSetup } from '../../http';
import type { NotificationsSetup } from '../../notifications';
import { CoreThemeProvider } from '../../theme';
import { StatusApp } from './status_app';

interface Deps {
  http: HttpSetup;
  notifications: NotificationsSetup;
}

export const renderApp = (
  { element, theme$ }: AppMountParameters,
  { http, notifications }: Deps
) => {
  ReactDOM.render(
    <I18nProvider>
      <CoreThemeProvider theme$={theme$}>
        <StatusApp http={http} notifications={notifications} />
      </CoreThemeProvider>
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
