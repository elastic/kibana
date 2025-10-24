/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tagsToFindOptions } from '@kbn/content-management-utils';
import type { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../dashboard_saved_object';
import type { DashboardSearchOptions } from './latest';

export function getSavedObjectFindOptions(
  query: SearchQuery,
  options: DashboardSearchOptions
): SavedObjectsFindOptions {
  // options.fields contains dashboard API field names.
  // Dashboard API field names can not be passed directly
  // to saved object search since dashboard API and
  // saved object fields have diverged.
  const soFields: string[] = [];
  (options?.fields ?? []).forEach((field) => {
    if (field === 'timeRange') {
      // Saved object API stores timeRange as timeFrom, timeTo, and timeRestore
      // All fields are needed to return timeRange in dashboard REST response
      soFields.push('timeFrom', 'timeTo', 'timeRestore');
    } else {
      soFields.push(field);
    }
  });

  return {
    type: DASHBOARD_SAVED_OBJECT_TYPE,
    searchFields: options?.onlyTitle ? ['title'] : ['title^3', 'description'],
    fields: soFields,
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
    namespaces: options?.spaces,
    ...tagsToFindOptions(query.tags),
  };
}
