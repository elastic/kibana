/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { PublishingSubject } from '../../publishing_subject';

export interface PublishesSavedSearch {
  savedSearch$: PublishingSubject<SavedSearch>;
}

export const apiPublishesSavedSearch = (
  unknownApi: null | unknown
): unknownApi is PublishesSavedSearch => {
  const embeddable = unknownApi as PublishesSavedSearch;
  return Boolean(embeddable.savedSearch$);
};
