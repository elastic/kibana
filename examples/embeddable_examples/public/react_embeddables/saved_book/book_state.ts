/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { BookAttributes, BookAttributesManager } from './types';

export const defaultBookAttributes: BookAttributes = {
  bookTitle: 'Pillars of the earth',
  authorName: 'Ken follett',
  numberOfPages: 973,
  bookSynopsis:
    'A spellbinding epic set in 12th-century England, The Pillars of the Earth tells the story of the struggle to build the greatest Gothic cathedral the world has known.',
};

export const stateManagerFromAttributes = (attributes: BookAttributes): BookAttributesManager => {
  const bookTitle = new BehaviorSubject<string>(attributes.bookTitle);
  const authorName = new BehaviorSubject<string>(attributes.authorName);
  const numberOfPages = new BehaviorSubject<number>(attributes.numberOfPages);
  const bookSynopsis = new BehaviorSubject<string | undefined>(attributes.bookSynopsis);

  return {
    bookTitle,
    authorName,
    numberOfPages,
    bookSynopsis,
    comparators: {
      bookTitle: [bookTitle, (val) => bookTitle.next(val)],
      authorName: [authorName, (val) => authorName.next(val)],
      numberOfPages: [numberOfPages, (val) => numberOfPages.next(val)],
      bookSynopsis: [bookSynopsis, (val) => bookSynopsis.next(val)],
    },
  };
};

export const serializeBookAttributes = (stateManager: BookAttributesManager): BookAttributes => ({
  bookTitle: stateManager.bookTitle.value,
  authorName: stateManager.authorName.value,
  numberOfPages: stateManager.numberOfPages.value,
  bookSynopsis: stateManager.bookSynopsis.value,
});
