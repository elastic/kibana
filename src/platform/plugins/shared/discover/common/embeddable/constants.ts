/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';

/** This constant refers to the parts of the saved search state that can be edited from a dashboard */
export const EDITABLE_SAVED_SEARCH_KEYS = [
  'sort',
  'columns',
  'rowHeight',
  'sampleSize',
  'rowsPerPage',
  'headerRowHeight',
  'density',
  'grid',
] as const satisfies ReadonlyArray<keyof SavedSearchAttributes>;
