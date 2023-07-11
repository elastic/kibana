/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VIEW_MODE } from '@kbn/saved-search-plugin/public';

/**
 * Returns a valid view mode
 * @param viewMode
 * @param isTextBasedQueryMode
 */
export const getValidViewMode = ({
  viewMode,
  isTextBasedQueryMode,
}: {
  viewMode?: VIEW_MODE;
  isTextBasedQueryMode: boolean;
}): VIEW_MODE | undefined => {
  if (viewMode === VIEW_MODE.AGGREGATED_LEVEL && isTextBasedQueryMode) {
    // only this mode is supported for text-based languages
    return VIEW_MODE.DOCUMENT_LEVEL;
  }

  return viewMode;
};
