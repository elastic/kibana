/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectAttributes } from '@kbn/core/types';

export const BOOK_SAVED_OBJECT = 'book';

export interface BookSavedObjectAttributes extends SavedObjectAttributes {
  title: string;
  author?: string;
  readIt?: boolean;
}
