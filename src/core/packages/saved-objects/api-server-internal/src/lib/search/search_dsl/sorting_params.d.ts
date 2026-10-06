/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SortOrder, SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsPitParams } from '@kbn/core-saved-objects-api-server/src/apis';
import { type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
export declare function getSortingParams(
  mappings: IndexMapping,
  type: string | string[],
  sortField?: string,
  sortOrder?: SortOrder,
  pit?: SavedObjectsPitParams
): {
  sort?: SortCombinations[];
};
