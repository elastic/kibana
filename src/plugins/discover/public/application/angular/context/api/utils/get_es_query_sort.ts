/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EsQuerySortValue, SortDirection } from '../../../../../kibana_services';

/**
 * Returns `EsQuerySort` which is used to sort records in the ES query
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html
 * @param timeField
 * @param tieBreakerField
 * @param sortDir
 */
export function getEsQuerySort(
  timeField: string,
  tieBreakerField: string,
  sortDir: SortDirection
): [EsQuerySortValue, EsQuerySortValue] {
  return [{ [timeField]: sortDir }, { [tieBreakerField]: sortDir }];
}
