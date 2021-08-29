/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters } from '../../application/types';
import type { HttpSetup } from '../../http/types';
import type { NotificationsSetup } from '../../notifications/notifications_service';
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
