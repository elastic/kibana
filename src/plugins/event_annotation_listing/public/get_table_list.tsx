/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
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
          savedObjectsTagging: services.savedObjectsTagging,
          FormattedRelative,
        }}
      >
        <EventAnnotationGroupTableList
          toasts={services.core.notifications.toasts}
          savedObjectsTagging={services.savedObjectsTagging}
          uiSettings={services.core.uiSettings}
          eventAnnotationService={services.eventAnnotationService}
          visualizeCapabilities={services.core.application.capabilities.visualize_v2}
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
