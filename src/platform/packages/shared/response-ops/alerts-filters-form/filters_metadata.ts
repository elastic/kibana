/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filterMetadata as ruleTagsFilterMetadata } from './components/alerts_filter_by_rule_tags';
import { filterMetadata as ruleTypesFilterMetadata } from './components/alerts_filter_by_rule_types';
import type { AlertsFilter, AlertsFilterMetadata } from './types';

export const alertsFiltersMetadata = {
  ruleTags: ruleTagsFilterMetadata,
  ruleTypes: ruleTypesFilterMetadata,
} as const satisfies Record<string, AlertsFilterMetadata<any>>;

export const getFilterMetadata = (filter: AlertsFilter) => {
  if (!filter?.type) {
    throw new Error(`Cannot get metadata for filter without type`);
  }
  const filterMetadata = alertsFiltersMetadata[filter.type];
  if (!filterMetadata) {
    throw new Error(`Alerts filter of type ${filter.type} not found`);
  }
  const value = filter.value as typeof filterMetadata.__valueType;
  return {
    ...filterMetadata,
    isEmpty: () => filterMetadata.isEmpty(value),
    toKql: () => filterMetadata.toKql(value),
  };
};
