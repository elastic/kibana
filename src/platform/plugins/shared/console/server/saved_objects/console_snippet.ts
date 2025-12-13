/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsType } from '@kbn/core/server';
import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { consoleSnippetSchemaV1 } from '../schemas/console_snippet';
import { CONSOLE_SNIPPET_SAVED_OBJECT_TYPE } from '../../common/constants';

export const consoleSnippetSavedObjectType: SavedObjectsType = {
  name: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  management: {
    icon: 'console',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle: (obj) => obj.attributes.title,
    getInAppUrl: (obj) => ({
      path: `/app/dev_tools#/console?loadSnippet=${encodeURIComponent(obj.id)}`,
      uiCapabilitiesPath: 'dev_tools.show',
    }),
  },
  mappings: {
    dynamic: false,
    properties: {
      title: { type: 'text' },
      titleKeyword: { type: 'keyword' },
      description: { type: 'text' },
      query: { type: 'text' },
      endpoint: { type: 'keyword' },
      method: { type: 'keyword' },
      tags: { type: 'keyword' },
      createdBy: { type: 'keyword' },
      updatedBy: { type: 'keyword' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: consoleSnippetSchemaV1.extends({}, { unknowns: 'ignore' }),
        create: consoleSnippetSchemaV1,
      },
    },
  },
};
