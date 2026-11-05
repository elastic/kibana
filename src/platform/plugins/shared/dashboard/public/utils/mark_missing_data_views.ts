/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsCodeRelatedItem } from '@kbn/as-code-shared-schemas';
import type { ImportJsonRelatedItem } from '@kbn/as-code-import-flyout-component';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { dataService } from '../services/kibana_services';

/** Marks each related data view with whether it exists in the current space. */
export const markMissingDataViews = async (
  relatedItems: AsCodeRelatedItem[]
): Promise<ImportJsonRelatedItem[]> => {
  if (!relatedItems.some(({ type }) => type === DATA_VIEW_SAVED_OBJECT_TYPE)) {
    return relatedItems;
  }

  let existingIds: Set<string>;
  try {
    const dataViews = await dataService.dataViews.getIdsWithTitle(true);
    existingIds = new Set(dataViews.map(({ id }) => id));
  } catch {
    // Without the list, the data views are shown as unchecked related items
    return relatedItems;
  }

  return relatedItems.map((item) =>
    item.type === DATA_VIEW_SAVED_OBJECT_TYPE
      ? { ...item, isMissing: !existingIds.has(item.id) }
      : item
  );
};
