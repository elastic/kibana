/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';

/** Applies FilterManager's defaults without mutating the loaded document or making it look edited. */
export const normalizeSessionFilters = (session: DiscoverSession): DiscoverSession => ({
  ...session,
  tabs: session.tabs.map((tab) => {
    const { serializedSearchSource } = tab;
    const { filter } = serializedSearchSource;
    if (!filter) {
      return tab;
    }

    return {
      ...tab,
      serializedSearchSource: {
        ...serializedSearchSource,
        filter: mapAndFlattenFilters(cloneDeep(filter)),
      },
    };
  }),
});
