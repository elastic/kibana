/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SavedObjectReference } from '@kbn/core/server';
import { Mutable } from 'utility-types';
import {
  BOOK_SAVED_OBJECT_TYPE,
  type SavedBookAttributes,
} from '../../../../../server/book/saved_object';
import { SEQUEL_TO_REF_NAME } from '../constants';
import { BookItem } from '../schema';

const extractReferences = (state: BookItem) => {
  const references: SavedObjectReference[] = [];
  const extractedRefNames: Mutable<Partial<SavedBookAttributes['metadata']>> = {};
  if (state.sequelTo) {
    extractedRefNames.sequelToBookRefName = SEQUEL_TO_REF_NAME;
    references.push({
      name: SEQUEL_TO_REF_NAME,
      type: BOOK_SAVED_OBJECT_TYPE,
      id: state.sequelTo,
    });
  }
  return { references, extractedRefNames };
};

export const transformIn = (
  state: BookItem
): {
  state: SavedBookAttributes;
  references?: Reference[];
} => {
  const { references, extractedRefNames } = extractReferences(state);
  return {
    state: {
      bookTitleAsArray: [...state.bookTitle],
      metadata: {
        numbers: {
          numberOfPages: state.pages,
          publicationYear: state.published ?? undefined,
        },
        text: {
          authorName: state.author,
          bookSynopsis: state.synopsis,
        },
        ...extractedRefNames,
      },
      // Generate a string of random letters and numbers to demonstrate simplifying a savedObject
      uselessGarbage: Array.from(Array(10), () => Math.random().toString(36).substring(2)).join(''),
    },
    references,
  };
};
