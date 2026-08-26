/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectCommon, FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { isEsqlSavedSearch } from '@kbn/discover-utils';

type DiscoverFinderAttributes = FinderAttributes & Partial<Pick<DiscoverSessionAttributes, 'tabs'>>;

export const showSavedObject = (savedObject: SavedObjectCommon<DiscoverFinderAttributes>) => {
  const firstTabAttributes = savedObject.attributes.tabs?.[0]?.attributes;
  return !isEsqlSavedSearch(savedObject) && !firstTabAttributes?.usesAdHocDataView;
};
