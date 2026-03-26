/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import type { SavedSearch } from '../types';

/**
 * Returns a new saved search
 * Used when e.g. Discover is opened without a saved search id
 * @param search
 */
export const getNewSavedSearch = ({
  searchSource,
}: {
  searchSource: ISearchStartSearchSource;
}): SavedSearch => ({
  searchSource: searchSource.createEmpty(),
  managed: false,
});
