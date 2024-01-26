/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { isOfAggregateQueryType } from '@kbn/es-query';

export type SavedQueryMenuVisibility =
  | 'hidden'
  | 'globally_managed' // managed by "Saved Query Management" global privilege
  | 'allowed_by_app_privilege'; // use only if your Kibana app grants this privilege, otherwise default to `globally_managed`

export const canShowSavedQuery = ({
  saveQueryMenuVisibility = 'hidden',
  query,
  core,
}: {
  saveQueryMenuVisibility?: SavedQueryMenuVisibility;
  query: AggregateQuery | Query | { [key: string]: any };
  core: CoreStart;
}): boolean => {
  // don't show Saved Query menu by default
  if (!saveQueryMenuVisibility || saveQueryMenuVisibility === 'hidden') {
    return false;
  }

  // Saved Queries are not supported for text-based languages (only Saved Searches)
  if (isOfAggregateQueryType(query)) {
    return false;
  }

  const isAllowedGlobally = Boolean(core.application.capabilities.savedQueryManagement?.saveQuery);

  // users can allow saving queries globally or grant permission per app
  if (saveQueryMenuVisibility === 'allowed_by_app_privilege') {
    return true;
  }

  return isAllowedGlobally;
};
