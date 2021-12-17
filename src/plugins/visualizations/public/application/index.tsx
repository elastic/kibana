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
import { KibanaContextProvider, KibanaThemeProvider } from '../../../kibana_react/public';
import { VisualizeApp } from './app';
import { VisualizeServices } from './types';
import { addHelpMenuToAppChrome, addBadgeToAppChrome } from './utils';

export const renderApp = (
  { element, onAppLeave }: AppMountParameters,
  services: VisualizeServices
) => {
  // add help link to visualize docs into app chrome menu
  addHelpMenuToAppChrome(services.chrome, services.docLinks);
  // add readonly badge if saving restricted
  if (!services.visualizeCapabilities.save) {
    addBadgeToAppChrome(services.chrome);
  }

  const app = (
    <KibanaThemeProvider theme$={services.theme.theme$}>
      <Router history={services.history}>
        <KibanaContextProvider services={services}>
          <services.presentationUtil.ContextProvider>
            <services.i18n.Context>
              <VisualizeApp onAppLeave={onAppLeave} />
            </services.i18n.Context>
          </services.presentationUtil.ContextProvider>
        </KibanaContextProvider>
      </Router>
    </KibanaThemeProvider>
  );

  ReactDOM.render(app, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
