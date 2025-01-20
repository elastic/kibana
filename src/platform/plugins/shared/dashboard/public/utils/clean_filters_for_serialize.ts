/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Filter } from '@kbn/es-query';

export function cleanFiltersForSerialize(filters?: Filter[]): Filter[] {
  if (!filters) return [];
  return filters.map((filter) => {
    if (filter.meta?.value) delete filter.meta.value;
    return filter;
  });
}
