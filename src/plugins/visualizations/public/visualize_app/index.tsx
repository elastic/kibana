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
import { Router } from '@kbn/shared-ux-router';

import { AppMountParameters } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { FormattedRelative } from '@kbn/i18n-react';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view-table';
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
    <KibanaRenderContextProvider {...services.core}>
      <Router history={services.history}>
        <KibanaContextProvider services={services}>
          <services.presentationUtil.ContextProvider>
            <TableListViewKibanaProvider
              {...{
                core: services.core,
                savedObjectsTagging: services.savedObjectsTagging,
                FormattedRelative,
              }}
            >
              <VisualizeApp onAppLeave={onAppLeave} />
            </TableListViewKibanaProvider>
          </services.presentationUtil.ContextProvider>
        </KibanaContextProvider>
      </Router>
    </KibanaRenderContextProvider>
  );

  ReactDOM.render(app, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
