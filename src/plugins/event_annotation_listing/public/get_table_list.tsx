/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { FormattedRelative } from '@kbn/i18n-react';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view-table';
import { type TableListTabParentProps } from '@kbn/content-management-tabbed-table-list-view';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { QueryInputServices } from '@kbn/visualization-ui-components';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { EmbeddableComponent as LensEmbeddableComponent } from '@kbn/lens-plugin/public';
import { ISessionService } from '@kbn/data-plugin/public';
import { EventAnnotationGroupTableList } from './components/table_list';

export interface EventAnnotationListingPageServices {
  core: CoreStart;
  savedObjectsTagging: SavedObjectsTaggingApi;
  eventAnnotationService: EventAnnotationServiceType;
  PresentationUtilContextProvider: FC;
  dataViews: DataView[];
  createDataView: (spec: DataViewSpec) => Promise<DataView>;
  queryInputServices: QueryInputServices;
  LensEmbeddableComponent: LensEmbeddableComponent;
  sessionService: ISessionService;
}

export const getTableList = (
  parentProps: TableListTabParentProps,
  services: EventAnnotationListingPageServices
) => {
  return (
    <RootDragDropProvider>
      <TableListViewKibanaProvider
        {...{
          core: services.core,
          toMountPoint,
          savedObjectsTagging: services.savedObjectsTagging,
          FormattedRelative,
        }}
      >
        <EventAnnotationGroupTableList
          toasts={services.core.notifications.toasts}
          savedObjectsTagging={services.savedObjectsTagging}
          uiSettings={services.core.uiSettings}
          eventAnnotationService={services.eventAnnotationService}
          visualizeCapabilities={services.core.application.capabilities.visualize}
          parentProps={parentProps}
          dataViews={services.dataViews}
          createDataView={services.createDataView}
          queryInputServices={services.queryInputServices}
          navigateToLens={() => services.core.application.navigateToApp('lens')}
          LensEmbeddableComponent={services.LensEmbeddableComponent}
          sessionService={services.sessionService}
        />
      </TableListViewKibanaProvider>
    </RootDragDropProvider>
  );
};
