/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { isOfAggregateQueryType } from '@kbn/es-query';

/**
 * Determines if saving queries is allowed within the saved query management popover (still requires privileges).
 * This does not impact if queries can be loaded, which is determined by the saved query management read privilege.
 */
export const canShowSavedQuery = ({
  allowSavingQueries = false,
  query,
  core,
}: {
  allowSavingQueries?: boolean;
  query: AggregateQuery | Query | { [key: string]: any };
  core: CoreStart;
}): boolean => {
  // Don't allow saving queries by default
  if (!allowSavingQueries) {
    return false;
  }

  // Saved Queries are not supported for ES|QL (only Saved Searches)
  if (isOfAggregateQueryType(query)) {
    return false;
  }

  return Boolean(core.application.capabilities.savedQueryManagement?.saveQuery);
};
