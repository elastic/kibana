/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EsQuerySortValue, SortDirection } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { SortCriteria, SortCriterion } from '../types';

export const normalizeSortCriteriaForDataView =
  (dataView: DataView) =>
  (sortCriteria: SortCriteria): EsQuerySortValue[] =>
    sortCriteria.map(normalizeSortCriterionForDataView(dataView));

export const normalizeSortCriterionForDataView =
  (dataView: DataView) =>
  ([fieldName, sortDirection]: SortCriterion): EsQuerySortValue => ({
    [fieldName]: {
      order: SortDirection[sortDirection],
      ...(fieldName === dataView.timeFieldName && dataView.isTimeNanosBased()
        ? { format: 'strict_date_optional_time_nanos', numeric_type: 'date_nanos' }
        : { format: 'strict_date_optional_time' }),
    },
  });

export const invertSortCriteria = (sortCriteria: SortCriteria): SortCriteria =>
  sortCriteria.map(([fieldName, sortDirection]) => [
    fieldName,
    sortDirection === 'asc' ? 'desc' : 'asc',
  ]);
