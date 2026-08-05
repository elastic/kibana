/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getValidViewMode } from '../../application/main/utils/get_valid_view_mode';
import { isEsqlMode } from '../initialize_fetch';

export function isPatternAnalysisMode(
  savedSearch: SavedSearch,
  dataView: DataView | undefined
): boolean {
  const validatedViewMode = getValidViewMode({
    viewMode: savedSearch.viewMode,
    isEsqlMode: isEsqlMode(savedSearch),
  });

  return validatedViewMode === VIEW_MODE.PATTERN_LEVEL && Boolean(dataView);
}
