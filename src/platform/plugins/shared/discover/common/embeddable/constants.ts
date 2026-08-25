/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';

/** Reference name used for the saved search saved object when the embeddable is by-reference */
export const SAVED_SEARCH_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

/**
 * Used for search embeddable transforms. The as-code API shape does not support tab id/label. When
 * transforming from the as-code API shape back to the stored shape, we use these synthetic values
 * to satisfy the stored shape/types.
 */
export const DISCOVER_SESSION_EMBEDDABLE_SYNTHETIC_TAB_ID =
  'discover_session_embeddable_synthetic_tab_id';
export const DISCOVER_SESSION_EMBEDDABLE_SYNTHETIC_TAB_LABEL =
  'discover_session_embeddable_synthetic_tab_label';

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
