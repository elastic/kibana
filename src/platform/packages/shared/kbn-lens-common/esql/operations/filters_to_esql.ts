/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromKueryExpression, luceneStringToDsl, toElasticsearchQuery } from '@kbn/es-query';
import type { FiltersIndexPatternColumn, LensAggFilter } from '../../datasources/operations';
import type { ToEsqlFn } from './types';

const isQueryValid = (filter: LensAggFilter, indexPattern: Parameters<ToEsqlFn>[2]) => {
  try {
    if (filter.input.language === 'kuery') {
      toElasticsearchQuery(fromKueryExpression(filter.input.query), indexPattern);
    } else {
      luceneStringToDsl(filter.input.query);
    }
    return true;
  } catch {
    return false;
  }
};

export const filtersToESQL: ToEsqlFn<FiltersIndexPatternColumn> = (
  column,
  _columnId,
  indexPattern
) => {
  const validFilters =
    column.params.filters?.filter((filter) => isQueryValid(filter, indexPattern)) ?? [];

  if (validFilters.some((filter) => filter.input.language === 'kquery')) return undefined;

  // Conversion of supported filter languages remains incomplete in this prototype.
  return undefined;
};
