/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectConfig } from '../../../saved_objects/public';
import { InternalTagDecoratedSavedObject } from './types';

/**
 * Inject the tags back into the object's references
 *
 * (`injectReferences`) is used when fetching the object from the backend
 */
export const injectTagReferences: Required<SavedObjectConfig>['injectReferences'] = (
  object,
  references = []
) => {
  ((object as unknown) as InternalTagDecoratedSavedObject).__tags = references
    .filter(({ type }) => type === 'tag')
    .map(({ id }) => id);
};
