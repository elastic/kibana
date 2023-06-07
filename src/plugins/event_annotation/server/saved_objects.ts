/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import {
  CoreSetup,
  mergeSavedObjectMigrationMaps,
  SavedObjectMigrationMap,
} from '@kbn/core/server';

import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import { EVENT_ANNOTATION_GROUP_TYPE } from '../common/constants';
import { EventAnnotationGroupSavedObjectAttributes } from '../common/content_management';

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
