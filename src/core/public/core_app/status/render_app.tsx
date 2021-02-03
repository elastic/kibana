/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import type { AppMountParameters } from '../../application';
import type { HttpSetup } from '../../http';
import type { NotificationsSetup } from '../../notifications';
import { StatusApp } from './status_app';

interface Deps {
  http: HttpSetup;
  notifications: NotificationsSetup;
}

export const renderApp = ({ element }: AppMountParameters, { http, notifications }: Deps) => {
  ReactDOM.render(
    <I18nProvider>
      <StatusApp http={http} notifications={notifications} />
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
