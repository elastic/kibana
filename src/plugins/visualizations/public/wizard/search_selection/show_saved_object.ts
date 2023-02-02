/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SimpleSavedObject, SavedObjectAttributes } from '@kbn/core/public';
import type { FinderAttributes } from '@kbn/saved-objects-plugin/public';

export interface SavedSearchesAttributes extends SavedObjectAttributes {
  isTextBasedQuery: boolean;
  usesAdHocDataView?: boolean;
}

export const showSavedObject = (savedObject: SimpleSavedObject<FinderAttributes>) => {
  const so = savedObject as unknown as SimpleSavedObject<SavedSearchesAttributes>;
  return !so.attributes.isTextBasedQuery && !so.attributes.usesAdHocDataView;
};
