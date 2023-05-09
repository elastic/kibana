/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EsQuerySortValue, SortDirection } from '@kbn/data-plugin/public';

/**
 * Returns `EsQuerySort` which is used to sort records in the ES query
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html
 * @param timeField
 * @param tieBreakerField
 * @param sortDir
 * @param isTimeNanosBased
 */
export function getEsQuerySort(
  timeField: string,
  tieBreakerField: string,
  sortDir: SortDirection,
  isTimeNanosBased: boolean
): [EsQuerySortValue, EsQuerySortValue] {
  return [
    {
      [timeField]: {
        order: sortDir,
        ...(isTimeNanosBased
          ? {
              format: 'strict_date_optional_time_nanos',
              numeric_type: 'date_nanos',
            }
          : { format: 'strict_date_optional_time' }),
      },
    },
    { [tieBreakerField]: sortDir },
  ];
}
