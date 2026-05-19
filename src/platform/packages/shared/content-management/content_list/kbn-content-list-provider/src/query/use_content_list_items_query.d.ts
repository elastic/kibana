/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListClientState, ContentListQueryData } from '../state/types';
/**
 * React Query hook for fetching content list items.
 *
 * Derives {@link ActiveFilters} from `queryText` via {@link useQueryModel}.
 *
 * When the data source provides an `invalidate` callback, the returned
 * `refetch` function calls it before re-executing the query so that any
 * internal cache (e.g. in a client-side strategy) is cleared first.
 */
export declare const useContentListItemsQuery: (
  clientState: ContentListClientState
) => ContentListQueryData & {
  refetch: () => Promise<void>;
  requery: () => Promise<void>;
};
