/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { AppMountParameters, ScopedHistory } from '@kbn/core-application-browser';
import { KibanaThemeProvider, toMountPoint } from '@kbn/kibana-react-plugin/public';
import ReactDOM from 'react-dom';
import { FormattedRelative } from '@kbn/i18n-react';
import { Router } from 'react-router-dom';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { EventAnnotationGroupListView } from './components/list_view';
import { EventAnnotationServiceType } from './event_annotation_service/types';

export interface EventAnnotationAppServices {
  history: ScopedHistory;
  core: CoreStart;
  savedObjectsTagging: SavedObjectsTaggingApi;
  eventAnnotationService: EventAnnotationServiceType;
  PresentationUtilContextProvider: FC;
  // setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  // savedObjectsTagging?: SavedObjectsTaggingApi;
}

export const renderApp = (
  { element }: AppMountParameters,
  services: EventAnnotationAppServices
) => {
  // // add readonly badge if saving restricted
  // if (!services.visualizeCapabilities.save) {
  //   addBadgeToAppChrome(services.chrome);
  // }

  const app = (
    <KibanaThemeProvider theme$={services.core.theme.theme$}>
      <Router history={services.history}>
        <services.PresentationUtilContextProvider>
          <services.core.i18n.Context>
            <TableListViewKibanaProvider
              {...{
                core: services.core,
                toMountPoint,
                savedObjectsTagging: services.savedObjectsTagging,
                FormattedRelative,
              }}
            >
              <EventAnnotationGroupListView
                uiSettings={services.core.uiSettings}
                eventAnnotationService={services.eventAnnotationService}
                visualizeCapabilities={services.core.application.capabilities.visualize}
              />
            </TableListViewKibanaProvider>
          </services.core.i18n.Context>
        </services.PresentationUtilContextProvider>
      </Router>
    </KibanaThemeProvider>
  );

  ReactDOM.render(app, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
