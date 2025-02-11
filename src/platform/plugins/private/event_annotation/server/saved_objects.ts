/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import {
  CoreSetup,
  mergeSavedObjectMigrationMaps,
  SavedObjectMigrationMap,
} from '@kbn/core/server';

import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import { VISUALIZE_APP_NAME } from '@kbn/visualizations-plugin/common/constants';
import { EVENT_ANNOTATION_GROUP_TYPE } from '@kbn/event-annotation-common';
import { ANNOTATIONS_LISTING_VIEW_ID } from '../common/constants';
import { EventAnnotationGroupSavedObjectAttributes } from '../common';

export function setupSavedObjects(coreSetup: CoreSetup) {
  coreSetup.savedObjects.registerType({
    name: EVENT_ANNOTATION_GROUP_TYPE,
    indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'multiple',
    management: {
      icon: 'flag',
      defaultSearchField: 'title',
      importableAndExportable: true,
      getTitle: (obj: { attributes: EventAnnotationGroupSavedObjectAttributes }) =>
        obj.attributes.title,
      getInAppUrl: (obj: { id: string }) => ({
        // TODO link to specific object
        path: `/app/${VISUALIZE_APP_NAME}#/${ANNOTATIONS_LISTING_VIEW_ID}`,
        uiCapabilitiesPath: 'visualize_v2.show',
      }),
    },
    migrations: () => {
      const dataViewMigrations = DataViewPersistableStateService.getAllMigrations();
      return mergeSavedObjectMigrationMaps(eventAnnotationGroupMigrations, dataViewMigrations);
    },
    mappings: {
      dynamic: false,
      properties: {
        title: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
      },
    },
  });
}

const eventAnnotationGroupMigrations: SavedObjectMigrationMap = {};
