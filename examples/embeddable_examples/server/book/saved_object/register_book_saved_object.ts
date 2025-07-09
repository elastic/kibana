/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup } from '@kbn/core/server';

import { bookAttributesSchema } from './schema';
import type { BookAttributes } from './types';

export const BOOK_SAVED_OBJECT_TYPE = 'book';

export function registerBookSavedObject(core: CoreSetup) {
  core.savedObjects.registerType<BookAttributes>({
    name: BOOK_SAVED_OBJECT_TYPE,
    getTitle: (obj) => obj.title,
    hidden: false,
    namespaceType: 'multiple-isolated',
    management: {
      visibleInManagement: true,
      importableAndExportable: true,
      getTitle(savedObject) {
        return savedObject.attributes.title;
      },
      icon: 'article',
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: bookAttributesSchema.extends({}, { unknowns: 'ignore' }),
          create: bookAttributesSchema,
        },
      },
    },
    mappings: {
      properties: {
        title: { type: 'text', index: true },
        bookJSON: { type: 'text', index: false },
      },
    },
  });
}
