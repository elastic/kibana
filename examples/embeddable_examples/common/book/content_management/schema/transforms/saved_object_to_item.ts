/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectAttributesWithReferences } from '@kbn/embeddable-plugin/common/types';
import type { SavedObjectReference } from '@kbn/core/server';
import { Mutable } from 'utility-types';
import type { SavedBookAttributes } from '../../../../../server/book/saved_object';
import type { BookAttributes } from '../../../../../server/book/content_management/latest';

const injectReferences = (attributes: SavedBookAttributes, references: SavedObjectReference[]) => {
  const injectedParams: Mutable<Partial<BookAttributes>> = {};
  if (attributes.metadata.sequelToBookRefName) {
    const sequelId = references.find((r) => r.name === attributes.metadata.sequelToBookRefName)?.id;
    if (sequelId) injectedParams.sequelTo = sequelId;
  }
  return injectedParams;
};

export const savedObjectToItem = ({
  attributes,
  references,
}: SavedObjectAttributesWithReferences<SavedBookAttributes>): BookAttributes => ({
  bookTitle: attributes.bookTitleAsArray.join(''),
  author: attributes.metadata.text.authorName,
  pages: attributes.metadata.numbers.numberOfPages,
  synopsis: attributes.metadata.text.bookSynopsis,
  published: attributes.metadata.numbers.publicationYear ?? null,
  ...injectReferences(attributes, references),
});
