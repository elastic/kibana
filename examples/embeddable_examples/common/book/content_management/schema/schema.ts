/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';
import type { VersionableEmbeddableObject } from '@kbn/embeddable-plugin/common';
import type { SavedBookAttributes } from '../../../../server/types';
import { itemToSavedObject, savedObjectToItem } from './transforms';

export const bookItemSchema = schema.object({
  bookTitle: schema.string(),
  author: schema.string(),
  pages: schema.number(),
  synopsis: schema.maybe(schema.string()),
  published: schema.maybe(schema.number()),
  sequelTo: schema.maybe(schema.string()),
});

export type BookItem = TypeOf<typeof bookItemSchema>;

export const bookAttributesDefinition: VersionableEmbeddableObject<SavedBookAttributes, BookItem> =
  {
    itemToSavedObject,
    savedObjectToItem,
  };
