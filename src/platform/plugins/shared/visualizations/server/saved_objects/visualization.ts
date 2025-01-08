/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { SavedObjectsType } from '@kbn/core/server';
import { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { CONTENT_ID } from '../../common/content_management';
import { getAllMigrations } from '../migrations/visualization_saved_object_migrations';
import { getInAppUrl } from './get_in_app_url';

export const getVisualizationSavedObjectType = (
  getSearchSourceMigrations: () => MigrateFunctionsObject
): SavedObjectsType => ({
  name: CONTENT_ID,
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  management: {
    icon: 'visualizeApp',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getInAppUrl,
  },
  mappings: {
    dynamic: false, // declared here to prevent indexing root level attribute fields
    properties: {
      description: { type: 'text' },
      title: { type: 'text' },
      version: { type: 'integer' },
      kibanaSavedObjectMeta: {
        properties: {},
      },
    },
  },
  schemas: {
    '8.8.0': schema.object({
      title: schema.string(),
      description: schema.maybe(schema.string()),
      version: schema.maybe(schema.number()),
      kibanaSavedObjectMeta: schema.maybe(schema.object({ searchSourceJSON: schema.string() })),
      uiStateJSON: schema.maybe(schema.string()),
      visState: schema.maybe(schema.string()),
      savedSearchRefName: schema.maybe(schema.string()),
    }),
  },
  migrations: () => getAllMigrations(getSearchSourceMigrations()),
});
