/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  discoverSessionApiDataSchema,
  type DiscoverSessionApiData,
} from '@kbn/as-code-discover-schema';
import type { ApiBodyEntry } from '@kbn/saved-objects-management-plugin/server';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { transformDiscoverSessionIn, transformDiscoverSessionOut } from './transforms';
import { assignStoredInlineDataViewIds } from './transforms/assign_stored_inline_data_view_ids';

/** Creates the `search` (Discover session) entry for Saved Objects Management's API body registry. */
export const createDiscoverSessionApiBodyEntry = (): ApiBodyEntry<
  DiscoverSessionApiData,
  DiscoverSessionAttributes
> => ({
  getSchema: () => discoverSessionApiDataSchema,
  // Same as the public GET: content that fails validation is dropped and reported.
  toApi: ({ attributes, references }) => {
    const { sessionState, warnings } = transformDiscoverSessionOut(attributes, references);
    return {
      body: sessionState,
      warnings: warnings.map(({ tab_id: tabId, key, message }) => ({
        message: `Tab [${tabId}] dropped [${key}]: ${message}`,
      })),
    };
  },
  // Same as the PUT route creating a session: inline data views get stored IDs.
  // The chart's data view ID stays inline, so new copies don't rewrite it.
  toStored: (body) => {
    const { attributes, references } = transformDiscoverSessionIn(body);
    return { attributes: assignStoredInlineDataViewIds(attributes), references };
  },
});
