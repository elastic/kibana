/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsType } from '@kbn/core/server';

import { savedBookAttributesSchema } from './schema';

export const BOOK_SAVED_OBJECT_TYPE = 'devExample_book';

export const createBookSavedObjectType = (): SavedObjectsType => ({
  name: BOOK_SAVED_OBJECT_TYPE,
  getTitle: (obj) => obj.attributes.title,
  hidden: false,
  namespaceType: 'multiple-isolated',
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: savedBookAttributesSchema.extends({}, { unknowns: 'ignore' }),
        create: savedBookAttributesSchema,
      },
    },
  },
  mappings: {
    properties: {
      bookTitleAsArray: { type: 'text', index: false },
      metadata: {
        properties: {
          text: {
            properties: {
              authorName: { type: 'text', index: false },
              bookSynopsis: { type: 'text', index: false },
            },
          },
          numbers: {
            properties: {
              numberOfPages: { type: 'integer' },
              publicationYear: { type: 'integer' },
            },
          },
        },
      },
      uselessGarbage: { type: 'text', index: false },
    },
  },
});
