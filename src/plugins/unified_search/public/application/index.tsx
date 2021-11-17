/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';

import { AppMountParameters } from 'kibana/public';
import { KibanaContextProvider } from '../../../kibana_react/public';
import { UnifiedSearchApp } from './app';
import { UnifiedSearchServices } from './types';

export const renderApp = (
  { element, onAppLeave }: AppMountParameters,
  services: UnifiedSearchServices
) => {
  const app = (
    <Router history={services.history}>
      <KibanaContextProvider services={services}>
        <services.i18n.Context>
          <UnifiedSearchApp onAppLeave={onAppLeave} />
        </services.i18n.Context>
      </KibanaContextProvider>
    </Router>
  );

  ReactDOM.render(app, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
