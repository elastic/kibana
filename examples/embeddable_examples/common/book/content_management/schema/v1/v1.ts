/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionableEmbeddableObject } from '@kbn/embeddable-plugin/common';
import type { SavedBookAttributes } from '../../../../../server/types';
import type { BookAttributes } from '../../../../../server/book/content_management/schema/v1';

export const bookAttributesDefinition: VersionableEmbeddableObject<
  SavedBookAttributes,
  BookAttributes
> = {
  // TODO up or down?
  itemToSavedObject: (item) => item,
  savedObjectToItem: (savedObject) => savedObject,
};
