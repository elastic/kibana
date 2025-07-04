/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectCommon, FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';

export interface SavedSearchesAttributes extends FinderAttributes {
  isTextBasedQuery: boolean;
  usesAdHocDataView?: boolean;
}

export const showSavedObject = (savedObject: SavedObjectCommon) => {
  const so = savedObject as SavedObjectCommon<SavedSearchesAttributes>;
  return !so.attributes.isTextBasedQuery && !so.attributes.usesAdHocDataView;
};
