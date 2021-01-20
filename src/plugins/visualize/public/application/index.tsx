/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';

import { AppMountParameters } from 'kibana/public';
import { KibanaContextProvider } from '../../../kibana_react/public';
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
    <Router history={services.history}>
      <KibanaContextProvider services={services}>
        <services.i18n.Context>
          <VisualizeApp onAppLeave={onAppLeave} />
        </services.i18n.Context>
      </KibanaContextProvider>
    </Router>
  );

  ReactDOM.render(app, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
