/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObject } from '@kbn/core/server';
import { BookState } from '../content_management';
import { BookAttributes } from './types';

export function bookToSavedObject(
  book: BookState
): Pick<SavedObject<BookAttributes>, 'attributes'> {
  const { bookTitle, ...rest } = book;
  return {
    attributes: {
      title: bookTitle,
      bookJSON: JSON.stringify(rest),
    },
  };
}
